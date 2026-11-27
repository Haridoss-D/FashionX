from rest_framework import serializers

from .models import Category, Product, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "image_url", "product_count"]


class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "color", "size", "price", "mrp", "stock", "image_url"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    variants = serializers.SerializerMethodField()

    def get_variants(self, obj):
        return VariantSerializer([v for v in obj.variants.all() if v.is_active], many=True).data

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "category", "category_slug",
            "price", "mrp", "discount_percent", "image_url", "sizes", "colors",
            "rating", "rating_count", "stock", "is_featured", "return_days",
            "highlights", "features", "specifications", "manufacturer_info", "variants",
        ]


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
import re
from decimal import Decimal

from django.db import transaction

from . import payments
from .inventory import sync_product_from_variants
from .delivery import delivery_window
from .models import Order, OrderItem

FREE_SHIPPING_ABOVE = Decimal("999")
SHIPPING_FEE = Decimal("99")


def normalize_phone(value):
    digits = re.sub(r"[\s\-+]", "", value)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise serializers.ValidationError("Enter a valid 10-digit mobile number.")
    return digits


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=20)
    size = serializers.CharField(required=False, allow_blank=True, default="")
    color = serializers.CharField(required=False, allow_blank=True, default="")


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "full_name", "email", "phone", "address", "city", "state",
            "pin_code", "payment_method", "payment_status", "status", "razorpay_order_id", "estimated_delivery",
            "subtotal", "shipping", "total", "items",
        ]
        read_only_fields = [
            "id", "order_number", "payment_status", "status", "razorpay_order_id", "estimated_delivery",
            "subtotal", "shipping", "total",
        ]

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_pin_code(self, value):
        if not re.fullmatch(r"\d{6}", value.strip()):
            raise serializers.ValidationError("Enter a valid 6-digit PIN code.")
        return value.strip()

    def validate_payment_method(self, value):
        if value == Order.Payment.ONLINE and not payments.is_configured():
            raise serializers.ValidationError("Online payment is not set up yet. Choose Cash on Delivery.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Your cart is empty.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop("items")
        products = Product.objects.select_for_update().filter(
            id__in=[i["product_id"] for i in items], is_active=True
        )
        by_id = {p.id: p for p in products}
        variants = {}  # product id -> {(color, size): variant}
        for v in ProductVariant.objects.select_for_update().filter(product_id__in=list(by_id), is_active=True):
            variants.setdefault(v.product_id, {})[(v.color, v.size)] = v

        lines, subtotal, left = [], Decimal("0"), {}
        for item in items:
            product = by_id.get(item["product_id"])
            if not product:
                raise serializers.ValidationError({"items": ["A product in your cart is no longer available."]})
            options = variants.get(product.id)
            if options:  # this product has its own price and stock per colour and size
                variant = options.get((item["color"], item["size"]))
                if not variant:
                    raise serializers.ValidationError(
                        {"items": [f"Choose a valid colour and size for {product.name}."]}
                    )
                key, stock, unit_price = ("v", variant.id), variant.stock, variant.price
            else:
                variant = None
                if product.sizes and item["size"] not in product.sizes:
                    raise serializers.ValidationError({"items": [f"Choose a valid size for {product.name}."]})
                key, stock, unit_price = ("p", product.id), product.stock, product.price
            available = left.get(key, stock)
            if available < item["quantity"]:
                raise serializers.ValidationError({"items": [f"Only {available} left of {product.name}."]})
            left[key] = available - item["quantity"]
            # Price always comes from the database, never from the browser
            subtotal += unit_price * item["quantity"]
            lines.append((product, unit_price, item))

        shipping = Decimal("0") if subtotal >= FREE_SHIPPING_ABOVE else SHIPPING_FEE
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        order = Order.objects.create(
            **validated_data, user=user, subtotal=subtotal, shipping=shipping, total=subtotal + shipping,
            estimated_delivery=delivery_window()[1],
        )
        for product, unit_price, item in lines:
            OrderItem.objects.create(
                order=order, product=product, name=product.name, price=unit_price,
                quantity=item["quantity"], size=item["size"], color=item["color"],
            )
        for (kind, pk), remaining in left.items():
            model = ProductVariant if kind == "v" else Product
            model.objects.filter(pk=pk).update(stock=remaining)
        for product_id in {p.id for p, _, _ in lines}:
            sync_product_from_variants(product_id)  # refreshes the product's total stock

        if order.payment_method == Order.Payment.ONLINE:
            try:
                order.razorpay_order_id = payments.create_razorpay_order(order)
            except payments.PaymentError as exc:
                # Raising here rolls the whole order back (transaction.atomic)
                raise serializers.ValidationError({"payment_method": [str(exc)]})
            order.save(update_fields=["razorpay_order_id"])
        return order


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------
from .models import Review  # noqa: E402


class ReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "name", "rating", "comment", "created_at"]

    def get_name(self, obj):
        return obj.user.first_name or "Customer"


class ReviewInputSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)
