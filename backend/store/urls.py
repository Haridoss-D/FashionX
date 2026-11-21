from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdminCustomersView, AdminOrderListView, AdminOrderUpdateView, AdminProductViewSet, AdminStatsView,
)
from .account_views import LoginView, LogoutView, MeView, MyOrdersView, RegisterView
from .payment_views import CancelPaymentView, RazorpayWebhookView, VerifyPaymentView
from .views import CategoryViewSet, OrderCreateView, ProductViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
router.register("admin/products", AdminProductViewSet, basename="admin-product")


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("health/", health),
    path("orders/", OrderCreateView.as_view()),
    path("orders/mine/", MyOrdersView.as_view()),
    path("admin/stats/", AdminStatsView.as_view()),
    path("admin/orders/", AdminOrderListView.as_view()),
    path("admin/orders/<int:pk>/", AdminOrderUpdateView.as_view()),
    path("admin/customers/", AdminCustomersView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("payments/verify/", VerifyPaymentView.as_view()),
    path("payments/cancel/", CancelPaymentView.as_view()),
    path("payments/webhook/", RazorpayWebhookView.as_view()),
    path("", include(router.urls)),
]
