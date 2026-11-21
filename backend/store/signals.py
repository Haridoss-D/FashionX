from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from . import sheets
from .models import Order

# Saves that only touch these fields do not change anything worth copying
IGNORED_FIELDS = {"order_number", "razorpay_order_id", "synced_to_sheet"}


@receiver(post_save, sender=Order)
def copy_order_to_sheet(sender, instance, created, update_fields=None, **kwargs):
    if not sheets.is_configured():
        return
    if not created and update_fields and set(update_fields) <= IGNORED_FIELDS:
        return
    # on_commit waits until the order AND its items are saved, then reads them fresh
    transaction.on_commit(lambda: sheets.sync_async(instance.pk))
