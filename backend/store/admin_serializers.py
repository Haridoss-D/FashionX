from django.db import transaction
from django.db.models import F
from django.utils.text import slugify
from rest_framework import serializers

from .account_serializers import OrderHistoryItemSerializer
from .models import Order, Product


class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderHistoryItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "created_at", "full_name", "email", "phone", "address", "city",
            "state", "pin_code", "payment_method", "payment_status", "status",
            "subtotal", "shipping", "total", "items",
        ]


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["status", "payment_status"]

    def validate_status(self, value):
        if self.instance.status == Order.Status.CANCELLED and value != Order.Status.CANCELLED:
            raise serializers.ValidationError("A cancelled order cannot be reopened. Ask the customer to order again.")
        return value

    def update(self, instance, validated_data):
        new_status = validated_data.get("status", instance.status)
        with transaction.atomic():
            if new_status == Order.Status.CANCELLED and instance.status != Order.Status.CANCELLED:
                for item in instance.items.exclude(product__isnull=True):  # put the stock back
                    Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
            return super().update(instance, validated_data)  # saving also refreshes the Google Sheet


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    slug = serializers.SlugField(required=False)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "category_name", "description", "price", "mrp",
            "image_url", "sizes", "colors", "stock", "is_featured", "is_active",
        ]
        extra_kwargs = {"price": {"min_value": 1}, "mrp": {"min_value": 1}}

    def _clean_list(self, value):
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError("Must be a list of text values.")
        return [v.strip() for v in value if v.strip()]

    def validate_sizes(self, value):
        return self._clean_list(value)

    def validate_colors(self, value):
        return self._clean_list(value)

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        mrp = attrs.get("mrp", getattr(self.instance, "mrp", None))
        if mrp and price and mrp <= price:
            raise serializers.ValidationError({"mrp": "MRP must be higher than the price. Leave it empty if not on sale."})
        return attrs

    def create(self, validated_data):
        if not validated_data.get("slug"):
            base = slugify(validated_data["name"]) or "product"
            slug, n = base, 2
            while Product.objects.filter(slug=slug).exists():
                slug, n = f"{base}-{n}", n + 1
            validated_data["slug"] = slug
        return super().create(validated_data)
