from django.conf import settings
from django.db.models import Count, Q
from rest_framework import generics, viewsets
from rest_framework.throttling import ScopedRateThrottle

from .models import Category, Product
from .serializers import CategorySerializer, OrderCreateSerializer, ProductSerializer

ORDERING = {
    "popularity": "-rating_count",
    "price_asc": "price",
    "price_desc": "-price",
    "newest": "-created_at",
}


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Category.objects.annotate(
            product_count=Count("products", filter=Q(products__is_active=True))
        )


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/products/?category=mens-wear,footwear&search=jacket
                      &min_price=500&max_price=3000&featured=true&ordering=price_asc
    """
    serializer_class = ProductSerializer
    lookup_field = "slug"

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related("category")
        p = self.request.query_params

        if p.get("category"):
            qs = qs.filter(category__slug__in=p["category"].split(","))
        if p.get("search"):
            qs = qs.filter(Q(name__icontains=p["search"]) | Q(description__icontains=p["search"]))
        if p.get("min_price"):
            qs = qs.filter(price__gte=p["min_price"])
        if p.get("max_price"):
            qs = qs.filter(price__lte=p["max_price"])
        if p.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        return qs.order_by(ORDERING.get(p.get("ordering"), "-rating_count"))


class OrderCreateView(generics.CreateAPIView):
    """POST /api/orders/  (guest checkout, no login needed)"""
    serializer_class = OrderCreateSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "orders"

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.data.get("payment_method") == "ONLINE":
            response.data["razorpay_key_id"] = settings.RAZORPAY_KEY_ID  # public key, safe to send
        return response
