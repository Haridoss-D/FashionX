"""Razorpay helpers. Uses plain HTTPS calls, so no extra SDK is needed."""
import hashlib
import hmac

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import F

from .inventory import restore_item_stock
from .models import Order

API = "https://api.razorpay.com/v1"


class PaymentError(Exception):
    pass


def is_configured():
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def create_razorpay_order(order):
    """Creates the payment order on Razorpay and returns its id (order_xxx)."""
    amount_paise = int((order.total * 100).to_integral_value())
    try:
        res = requests.post(
            f"{API}/orders",
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            json={"amount": amount_paise, "currency": "INR", "receipt": order.order_number},
            timeout=15,
        )
    except requests.RequestException:
        raise PaymentError("Could not reach the payment service. Please try again.")
    if res.status_code != 200:
        raise PaymentError("The payment service rejected the request. Check your Razorpay keys.")
    return res.json()["id"]


def _sign(secret, message: bytes) -> str:
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def verify_payment_signature(razorpay_order_id, razorpay_payment_id, signature):
    if not (is_configured() and razorpay_order_id and razorpay_payment_id and signature):
        return False
    expected = _sign(settings.RAZORPAY_KEY_SECRET, f"{razorpay_order_id}|{razorpay_payment_id}".encode())
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body: bytes, signature):
    if not (settings.RAZORPAY_WEBHOOK_SECRET and signature):
        return False
    expected = _sign(settings.RAZORPAY_WEBHOOK_SECRET, raw_body)
    return hmac.compare_digest(expected, signature)


def mark_paid(order, payment_id):
    """Safe to call more than once (the browser and the webhook may both report it)."""
    if order.payment_status == Order.PaymentStatus.PAID:
        return
    order.payment_status = Order.PaymentStatus.PAID
    order.razorpay_payment_id = payment_id
    if order.status == Order.Status.CANCELLED:  # paid after we released it
        order.status = Order.Status.PENDING
    order.save(update_fields=["payment_status", "razorpay_payment_id", "status"])


@transaction.atomic
def release_order(order):
    """Cancels an unpaid order and puts its stock back."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.payment_status != Order.PaymentStatus.PENDING or order.status != Order.Status.PENDING:
        return False
    for item in order.items.exclude(product__isnull=True):
        restore_item_stock(item)
    order.status = Order.Status.CANCELLED
    order.payment_status = Order.PaymentStatus.FAILED
    order.save(update_fields=["status", "payment_status"])
    return True
