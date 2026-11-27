"""Stock and price helpers for products that have different prices per colour and size."""
from django.db.models import F

from .models import Product, ProductVariant


def sync_product_from_variants(product_id):
    """Keeps the product's own price, stock, sizes and colours in line with its variants.

    The product then shows the lowest variant price ("From ₹...") in listings and search,
    and its total stock is the sum of all variants. Products without variants are left alone.
    """
    variants = list(ProductVariant.objects.filter(product_id=product_id, is_active=True).order_by("id"))
    if not variants:
        return
    cheapest = min(variants, key=lambda v: v.price)
    sizes, colors = [], []
    for v in variants:
        if v.size and v.size not in sizes:
            sizes.append(v.size)
        if v.color and v.color not in colors:
            colors.append(v.color)
    Product.objects.filter(pk=product_id).update(
        price=cheapest.price, mrp=cheapest.mrp, stock=sum(v.stock for v in variants), sizes=sizes, colors=colors,
    )


def restore_item_stock(item):
    """Puts the quantity of a cancelled order line back into stock."""
    if not item.product_id:
        return
    variant = ProductVariant.objects.filter(
        product_id=item.product_id, color=item.color, size=item.size, is_active=True
    ).first()
    if variant:
        ProductVariant.objects.filter(pk=variant.pk).update(stock=F("stock") + item.quantity)
        sync_product_from_variants(item.product_id)
    else:
        Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)
