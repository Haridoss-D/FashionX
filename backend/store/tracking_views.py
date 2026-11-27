import re

from django.db import transaction
from django.db.models import F
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .account_serializers import OrderHistoryItemSerializer
from .inventory import restore_item_stock
from .models import Order
from .throttles import TrackThrottle

NOT_FOUND = {"detail": "We could not find an order with these details. Check the order number and mobile number."}


class TrackOrderSerializer(serializers.ModelSerializer):
    items = OrderHistoryItemSerializer(many=True, read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    cancel_until = serializers.DateTimeField(source="cancel_deadline", read_only=True)

    class Meta:
        model = Order
        fields = [
            "order_number", "created_at", "status", "payment_method", "payment_status",
            "estimated_delivery", "city", "subtotal", "shipping", "total", "items",
            "can_cancel", "cancel_until",
        ]


def clean_phone(value):
    digits = re.sub(r"\D", "", str(value or ""))
    return digits[2:] if len(digits) == 12 and digits.startswith("91") else digits


def find_order(request):
    """An order is found with its number plus the mobile number, or by its logged-in owner."""
    number = str(request.data.get("order_number", "")).strip().upper()
    if not number:
        return None
    order = Order.objects.filter(order_number=number).prefetch_related("items").first()
    if not order:
        return None
    if request.user.is_authenticated and order.user_id == request.user.id:
        return order
    if clean_phone(request.data.get("phone")) == order.phone:
        return order
    return None


@transaction.atomic
def cancel_order(order):
    """Cancels a pending order and puts its stock back. Returns False if it is too late."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if not order.can_cancel:
        return False
    for item in order.items.exclude(product__isnull=True):
        restore_item_stock(item)
    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status"])  # saving also refreshes the Google Sheet
    return True


class TrackOrderView(APIView):
    """POST /api/orders/track/  {order_number, phone}"""
    throttle_classes = [TrackThrottle]

    def post(self, request):
        order = find_order(request)
        if not order:
            return Response(NOT_FOUND, status=404)
        return Response(TrackOrderSerializer(order).data)


class CancelOrderView(APIView):
    """POST /api/orders/cancel/  {order_number, phone}. Only within 24 hours and before shipping."""
    throttle_classes = [TrackThrottle]

    def post(self, request):
        order = find_order(request)
        if not order:
            return Response(NOT_FOUND, status=404)
        if not cancel_order(order):
            reason = (
                "The 24-hour cancellation window has ended."
                if order.status == Order.Status.PENDING
                else "This order has already shipped, been delivered, or been cancelled."
            )
            return Response({"detail": reason}, status=400)
        return Response(TrackOrderSerializer(Order.objects.get(pk=order.pk)).data)
