import json

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import payments
from .models import Order


class VerifyPaymentView(APIView):
    """POST /api/payments/verify/  Called by the browser after Razorpay reports success."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payments"

    def post(self, request):
        oid = request.data.get("razorpay_order_id", "")
        pid = request.data.get("razorpay_payment_id", "")
        sig = request.data.get("razorpay_signature", "")

        order = Order.objects.filter(razorpay_order_id=oid).first() if oid else None
        if not order or not payments.verify_payment_signature(oid, pid, sig):
            return Response({"detail": "Payment could not be verified."}, status=status.HTTP_400_BAD_REQUEST)

        payments.mark_paid(order, pid)
        return Response({"order_number": order.order_number, "total": order.total})


class CancelPaymentView(APIView):
    """POST /api/payments/cancel/  Called when the customer closes the payment window."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payments"

    def post(self, request):
        oid = request.data.get("razorpay_order_id", "")
        order = Order.objects.filter(razorpay_order_id=oid).first() if oid else None
        if order:
            payments.release_order(order)
        return Response({"status": "ok"})


class RazorpayWebhookView(APIView):
    """POST /api/payments/webhook/  Razorpay tells us about payments even if the browser was closed."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        raw = request.body  # read before anything else touches the request
        if not payments.verify_webhook_signature(raw, request.headers.get("X-Razorpay-Signature", "")):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            event = json.loads(raw)
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event.get("event") in ("payment.captured", "order.paid"):
            payment = event.get("payload", {}).get("payment", {}).get("entity", {})
            order = Order.objects.filter(razorpay_order_id=payment.get("order_id", "")).first()
            if order:
                payments.mark_paid(order, payment.get("id", ""))
        return Response({"status": "ok"})
