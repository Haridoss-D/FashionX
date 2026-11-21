from django.db.models import Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_serializers import (
    AdminOrderSerializer, AdminOrderUpdateSerializer, AdminProductSerializer,
)
from .models import Order, Product

# Orders that count: Cash on Delivery, or online orders that were actually paid.
# (Abandoned online checkouts are left out, same as the Google Sheet.)
VISIBLE = Q(payment_method=Order.Payment.COD) | Q(payment_status=Order.PaymentStatus.PAID)


class StaffOnly:
    permission_classes = [IsAdminUser]  # is_staff accounts only


def month_floor(dt, months_back):
    year, month = dt.year, dt.month - months_back
    while month < 1:
        month += 12
        year -= 1
    return dt.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)


class AdminStatsView(StaffOnly, APIView):
    def get(self, request):
        orders = Order.objects.filter(VISIBLE)
        paid = Order.objects.filter(payment_status=Order.PaymentStatus.PAID).exclude(status=Order.Status.CANCELLED)

        now = timezone.localtime()
        rows = (
            paid.filter(created_at__gte=month_floor(now, 5))
            .annotate(m=TruncMonth("created_at")).values("m").annotate(total=Sum("total"))
        )
        by_month = {}
        for r in rows:
            m = timezone.localtime(r["m"])
            by_month[(m.year, m.month)] = float(r["total"])
        sales = []
        for back in range(5, -1, -1):
            d = month_floor(now, back)
            sales.append({"label": d.strftime("%b"), "total": by_month.get((d.year, d.month), 0)})

        return Response({
            "products": Product.objects.filter(is_active=True).count(),
            "customers": orders.values("phone").distinct().count(),
            "orders": orders.count(),
            "revenue": float(paid.aggregate(t=Sum("total"))["t"] or 0),
            "sales": sales,
            "recent_orders": AdminOrderSerializer(
                orders.prefetch_related("items").order_by("-created_at")[:5], many=True
            ).data,
        })


class AdminOrderListView(StaffOnly, generics.ListAPIView):
    serializer_class = AdminOrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(VISIBLE).prefetch_related("items").order_by("-created_at")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("search"):
            term = p["search"]
            qs = qs.filter(Q(order_number__icontains=term) | Q(full_name__icontains=term) | Q(phone__icontains=term))
        return qs[:200]


class AdminOrderUpdateView(StaffOnly, generics.UpdateAPIView):
    queryset = Order.objects.all()
    serializer_class = AdminOrderUpdateSerializer
    http_method_names = ["patch"]


class AdminProductViewSet(StaffOnly, viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category").order_by("-created_at")
    serializer_class = AdminProductSerializer

    def perform_destroy(self, instance):
        # Hide instead of delete, so old orders keep their product details
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class AdminCustomersView(StaffOnly, APIView):
    """One row per mobile number, built from orders (guests included)."""

    def get(self, request):
        customers = {}
        for o in Order.objects.filter(VISIBLE).order_by("created_at"):
            c = customers.setdefault(o.phone, {"phone": o.phone, "orders": 0, "total_spent": 0})
            c.update(name=o.full_name, email=o.email, city=o.city, last_order=o.created_at)
            if o.status != Order.Status.CANCELLED:
                c["orders"] += 1
                c["total_spent"] += float(o.total)
        return Response(sorted(customers.values(), key=lambda c: c["last_order"], reverse=True))
