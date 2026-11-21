from decimal import Decimal

from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Extra customer details that Django's built-in User does not have."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Profile of {self.user}"


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(unique=True)
    image_url = models.URLField(blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(
        "MRP (original price)", max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Fill only if the product is on sale.",
    )
    image_url = models.URLField(blank=True, help_text="Link to the product photo")
    sizes = models.JSONField(default=list, blank=True, help_text='Example: ["S", "M", "L", "XL"]')
    colors = models.JSONField(default=list, blank=True, help_text='Example: ["Black", "Beige"]')
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=Decimal("0.0"))
    rating_count = models.PositiveIntegerField(default=0)
    stock = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def discount_percent(self):
        if self.mrp and self.mrp > self.price:
            return int(round((self.mrp - self.price) / self.mrp * 100))
        return 0


class Order(models.Model):
    class Payment(models.TextChoices):
        ONLINE = "ONLINE", "Online (Razorpay)"
        COD = "COD", "Cash on Delivery"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    order_number = models.CharField(max_length=20, unique=True, editable=False, blank=True, null=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )  # empty for guest checkout
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80)
    pin_code = models.CharField(max_length=10)

    payment_method = models.CharField(max_length=10, choices=Payment.choices)
    payment_status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    razorpay_order_id = models.CharField(max_length=60, blank=True)
    razorpay_payment_id = models.CharField(max_length=60, blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    synced_to_sheet = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.order_number:
            self.order_number = f"ORD{12000 + self.pk}"
            super().save(update_fields=["order_number"])

    def __str__(self):
        return f"{self.order_number} - {self.full_name}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=160)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    size = models.CharField(max_length=10, blank=True)
    color = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return f"{self.name} x {self.quantity}"
