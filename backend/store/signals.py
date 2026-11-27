from decimal import Decimal

from django.db import transaction
from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from . import sheets
from . import inventory
from .models import Order, Product, ProductVariant, Review

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


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_product_rating(sender, instance, **kwargs):
    """The rating shown in the shop is always the average of the visible reviews."""
    stats = Review.objects.filter(product_id=instance.product_id, is_visible=True).aggregate(
        avg=Avg("rating"), n=Count("id")
    )
    rating = Decimal(str(round(stats["avg"], 1))) if stats["n"] else Decimal("0.0")
    Product.objects.filter(pk=instance.product_id).update(rating=rating, rating_count=stats["n"])


@receiver(post_save, sender=ProductVariant)
@receiver(post_delete, sender=ProductVariant)
def keep_product_in_sync(sender, instance, **kwargs):
    inventory.sync_product_from_variants(instance.product_id)
