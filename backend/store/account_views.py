from django.contrib.auth import authenticate
from rest_framework import generics, permissions
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .account_serializers import OrderHistorySerializer, ProfileUpdateSerializer, RegisterSerializer
from .models import Order, Profile


def user_payload(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    return {
        "id": user.id, "username": user.username, "full_name": user.first_name,
        "email": user.email, "phone": profile.phone, "is_staff": user.is_staff,
    }


def session_response(user, code=200):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user_payload(user)}, status=code)


class PublicAuthView(APIView):
    """Login and sign-up: open to everyone, limited per visitor, and they ignore any old token."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RegisterView(PublicAuthView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return session_response(serializer.save(), 201)


class LoginView(PublicAuthView):
    def post(self, request):
        # Customers log in with their email; staff may also use their admin username
        identifier = str(request.data.get("email", "")).strip()
        password = str(request.data.get("password", ""))
        user = authenticate(request, username=identifier, password=password) or authenticate(
            request, username=identifier.lower(), password=password
        )
        if not user or not user.is_active:
            return Response({"detail": "Incorrect email or password."}, status=400)
        return session_response(user)


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"status": "ok"})


class MeView(APIView):
    """GET /api/auth/me/  and  PATCH /api/auth/me/"""

    def get(self, request):
        return Response(user_payload(request.user))

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        return Response(user_payload(serializer.apply()))


class MyOrdersView(generics.ListAPIView):
    """GET /api/orders/mine/  Only the logged-in customer's own orders."""
    serializer_class = OrderHistorySerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")
