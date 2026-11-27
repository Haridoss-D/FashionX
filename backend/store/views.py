from django.conf import settings
from django.db.models import Count, Q
from django.http import JsonResponse
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .delivery import delivery_window
from .models import Category, Order, OrderItem, Product, Review
from .serializers import (
    CategorySerializer, OrderCreateSerializer, ProductSerializer, ReviewInputSerializer, ReviewSerializer,
)

ORDERING = {
    "popularity": "-rating_count",
    "price_asc": "price",
    "price_desc": "-price",
    "newest": "-created_at",
}


def has_received(user, product):
    """Only customers whose order with this product was delivered may review it."""
    return OrderItem.objects.filter(
        order__user=user, product=product, order__status=Order.Status.DELIVERED
    ).exists()


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Category.objects.annotate(
            product_count=Count("products", filter=Q(products__is_active=True))
        )


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/products/?category=mens-wear,footwear&search=jacket&ids=1,2,3
                      &min_price=500&max_price=3000&featured=true&ordering=price_asc
    GET /api/products/<slug>/similar/
    GET|POST /api/products/<slug>/reviews/
    """
    serializer_class = ProductSerializer
    lookup_field = "slug"

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related("category").prefetch_related("variants")
        p = self.request.query_params

        if p.get("ids"):
            qs = qs.filter(id__in=[int(i) for i in p["ids"].split(",") if i.strip().isdigit()])
        if p.get("category"):
            qs = qs.filter(category__slug__in=p["category"].split(","))
        if p.get("search"):
            term = p["search"].strip()
            qs = qs.filter(
                Q(name__icontains=term) | Q(description__icontains=term) | Q(category__name__icontains=term)
            )
        if p.get("min_price"):
            qs = qs.filter(price__gte=p["min_price"])
        if p.get("max_price"):
            qs = qs.filter(price__lte=p["max_price"])
        if p.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        return qs.order_by(ORDERING.get(p.get("ordering"), "-rating_count"))

    @action(detail=True, methods=["get"])
    def similar(self, request, slug=None):
        product = self.get_object()
        others = (
            Product.objects.filter(is_active=True).exclude(pk=product.pk)
            .select_related("category").prefetch_related("variants")
        )
        picks = list(others.filter(category=product.category).order_by("-rating_count")[:4])
        if len(picks) < 4:  # small shop: fill the row with other popular products
            more = others.exclude(pk__in=[p.pk for p in picks]).order_by("-rating_count")[: 4 - len(picks)]
            picks += list(more)
        return Response(ProductSerializer(picks, many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="reviews")
    def reviews(self, request, slug=None):
        product = self.get_object()
        user = request.user if request.user.is_authenticated else None

        if request.method == "POST":
            if not user:
                return Response({"detail": "Please log in to write a review."}, status=401)
            if not has_received(user, product):
                return Response(
                    {"detail": "Only customers whose order has been delivered can review this product."}, status=403
                )
            data = ReviewInputSerializer(data=request.data)
            data.is_valid(raise_exception=True)
            comment = data.validated_data.get("comment", "").strip()
            review, created = Review.objects.get_or_create(
                product=product, user=user, defaults={"rating": data.validated_data["rating"], "comment": comment}
            )
            if not created:  # one review per customer: this edits it
                review.rating = data.validated_data["rating"]
                review.comment = comment
                review.save()

        mine = Review.objects.filter(product=product, user=user).first() if user else None
        shown = Review.objects.filter(product=product, is_visible=True).select_related("user")
        return Response({
            "reviews": ReviewSerializer(shown, many=True).data,
            "can_review": bool(user and has_received(user, product)),
            "my_review": ReviewSerializer(mine).data if mine else None,
        })


def delivery_info(request):
    earliest, latest = delivery_window()
    return JsonResponse({"min": earliest.isoformat(), "max": latest.isoformat()})


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
