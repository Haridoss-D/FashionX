from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Order, OrderItem, Profile
from .serializers import normalize_phone

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Try logging in.")
        return value

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_password(self, value):
        try:
            django_validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, data):
        user = User.objects.create_user(
            username=data["email"], email=data["email"], password=data["password"],
            first_name=data["full_name"].strip(),
        )
        Profile.objects.create(user=user, phone=data["phone"])
        return user


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False)
    notify_orders = serializers.BooleanField(required=False)
    notify_offers = serializers.BooleanField(required=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username__iexact=value).exclude(pk=self.context["user"].pk).exists():
            raise serializers.ValidationError("Another account already uses this email.")
        return value

    def validate_phone(self, value):
        return normalize_phone(value)

    def apply(self):
        user, data = self.context["user"], self.validated_data
        if "full_name" in data:
            user.first_name = data["full_name"].strip()
        if "email" in data:
            user.email = user.username = data["email"]  # email is the login name
        user.save()
        profile, _ = Profile.objects.get_or_create(user=user)
        changed = False
        for field in ("phone", "notify_orders", "notify_offers"):
            if field in data:
                setattr(profile, field, data[field])
                changed = True
        if changed:
            profile.save()
        return user


class OrderHistoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["name", "price", "quantity", "size", "color"]


class OrderHistorySerializer(serializers.ModelSerializer):
    items = OrderHistoryItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_number", "created_at", "status", "payment_method", "payment_status",
            "subtotal", "shipping", "total", "items",
        ]
