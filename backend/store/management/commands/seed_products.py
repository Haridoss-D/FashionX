from decimal import Decimal

from django.core.management.base import BaseCommand

from store.models import Category, Product


def img(text, w=400, h=500):
    return f"https://placehold.co/{w}x{h}/efe9e1/333?text={text.replace(' ', '+')}"


CATEGORIES = [
    ("Men's Wear", "mens-wear"),
    ("Women's Wear", "womens-wear"),
    ("Footwear", "footwear"),
    ("Accessories", "accessories"),
]

# (category slug, name, slug, price, mrp, rating, reviews, featured, sizes, colors)
PRODUCTS = [
    ("mens-wear", "Men's Denim Jacket", "mens-denim-jacket", 2499, None, "4.5", 124, True, ["S", "M", "L", "XL"], ["Black", "Blue"]),
    ("womens-wear", "Floral Dress", "floral-dress", 1999, 2499, "4.6", 98, True, ["S", "M", "L"], ["Pink", "White"]),
    ("footwear", "Casual Sneakers", "casual-sneakers", 2299, None, "4.7", 210, True, ["S", "M", "L", "XL"], ["White", "Grey"]),
    ("accessories", "Sunglasses", "sunglasses", 999, None, "4.5", 75, False, [], ["Gold", "Black"]),
    ("accessories", "Leather Handbag", "leather-handbag", 3499, None, "4.8", 120, True, [], ["Brown", "Black"]),
    ("mens-wear", "Oversized Hoodie", "oversized-hoodie", 1799, 2249, "4.6", 88, True, ["S", "M", "L", "XL"], ["Black", "Beige"]),
]


class Command(BaseCommand):
    help = "Adds demo categories and products (safe to run more than once)."

    def handle(self, *args, **options):
        cats = {}
        for name, slug in CATEGORIES:
            cats[slug], _ = Category.objects.get_or_create(
                slug=slug, defaults={"name": name, "image_url": img(name, 400, 300)}
            )
        for cat, name, slug, price, mrp, rating, reviews, featured, sizes, colors in PRODUCTS:
            Product.objects.update_or_create(
                slug=slug,
                defaults={
                    "category": cats[cat], "name": name, "price": Decimal(price),
                    "mrp": Decimal(mrp) if mrp else None, "rating": Decimal(rating),
                    "rating_count": reviews, "is_featured": featured, "sizes": sizes,
                    "colors": colors, "stock": 50, "image_url": img(name),
                    "description": f"{name} from the FashionX collection.",
                },
            )
        self.stdout.write(self.style.SUCCESS("Demo data ready."))
