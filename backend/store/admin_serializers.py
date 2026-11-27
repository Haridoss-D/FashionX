from django.db import transaction
from django.db.models import F
from django.utils.text import slugify
from rest_framework import serializers

from .account_serializers import OrderHistoryItemSerializer
from .inventory import restore_item_stock
from .models import Order, Product, ProductVariant


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
                    restore_item_stock(item)
            return super().update(instance, validated_data)  # saving also refreshes the Google Sheet


class AdminVariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductVariant
        fields = ["id", "color", "size", "price", "mrp", "stock", "image_url", "is_active"]
        extra_kwargs = {"price": {"min_value": 1}, "mrp": {"min_value": 1}}

    def validate(self, attrs):
        if attrs.get("mrp") and attrs["mrp"] <= attrs["price"]:
            raise serializers.ValidationError("The original price must be higher than the selling price.")
        attrs["color"] = attrs.get("color", "").strip()
        attrs["size"] = attrs.get("size", "").strip()
        return attrs


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    slug = serializers.SlugField(required=False)
    variants = AdminVariantSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "category_name", "description", "price", "mrp",
            "image_url", "sizes", "colors", "stock", "is_featured", "is_active", "return_days",
            "highlights", "features", "specifications", "manufacturer_info", "variants",
        ]
        extra_kwargs = {"price": {"min_value": 1}, "mrp": {"min_value": 1}, "return_days": {"max_value": 60}}

    def _clean_list(self, value):
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise serializers.ValidationError("Must be a list of text values.")
        return [v.strip() for v in value if v.strip()]

    def _clean_pairs(self, value):
        if not isinstance(value, list) or len(value) > 30:
            raise serializers.ValidationError("Use at most 30 rows.")
        rows = []
        for row in value:
            if not isinstance(row, dict):
                raise serializers.ValidationError("Each row needs a name and a value.")
            label, text = str(row.get("label", "")).strip()[:60], str(row.get("value", "")).strip()[:300]
            if label and text:
                rows.append({"label": label, "value": text})
        return rows

    def validate_sizes(self, value):
        return self._clean_list(value)

    def validate_colors(self, value):
        return self._clean_list(value)

    def validate_highlights(self, value):
        return self._clean_pairs(value)

    def validate_specifications(self, value):
        return self._clean_pairs(value)

    def validate_variants(self, rows):
        seen = set()
        for row in rows:
            key = (row.get("color", "").strip().lower(), row.get("size", "").strip().lower())
            if key in seen:
                raise serializers.ValidationError("Two rows have the same colour and size.")
            seen.add(key)
        return rows

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        mrp = attrs.get("mrp", getattr(self.instance, "mrp", None))
        if mrp and price and mrp <= price:
            raise serializers.ValidationError({"mrp": "MRP must be higher than the price. Leave it empty if not on sale."})
        return attrs

    def _save_variants(self, product, rows):
        existing = {v.id: v for v in product.variants.all()}
        kept = {row["id"] for row in rows if row.get("id") in existing}
        product.variants.exclude(id__in=kept).delete()
        for row in rows:
            row = dict(row)
            vid = row.pop("id", None)
            if vid in existing:
                variant = existing[vid]
                for field, value in row.items():
                    setattr(variant, field, value)
                variant.save()
            else:
                ProductVariant.objects.create(product=product, **row)

    @transaction.atomic
    def create(self, validated_data):
        variants = validated_data.pop("variants", None)
        if not validated_data.get("slug"):
            base = slugify(validated_data["name"]) or "product"
            slug, n = base, 2
            while Product.objects.filter(slug=slug).exists():
                slug, n = f"{base}-{n}", n + 1
            validated_data["slug"] = slug
        product = super().create(validated_data)
        if variants:
            self._save_variants(product, variants)
        product.refresh_from_db()  # the price, stock and sizes are recalculated from the variants
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        variants = validated_data.pop("variants", None)
        instance = super().update(instance, validated_data)
        if variants is not None:
            self._save_variants(instance, variants)
        instance.refresh_from_db()
        return instance
