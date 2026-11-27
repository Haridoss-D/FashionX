from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Enquiry
from .serializers import normalize_phone
from .throttles import EnquiryThrottle


class EnquirySerializer(serializers.ModelSerializer):
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)  # hidden trap for bots

    class Meta:
        model = Enquiry
        fields = ["kind", "name", "email", "phone", "business", "order_number", "message", "website"]

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate(self, attrs):
        if attrs["kind"] in (Enquiry.Kind.SELLER, Enquiry.Kind.ADVERTISE):
            if not attrs.get("business", "").strip():
                raise serializers.ValidationError({"business": "Please enter your business name."})
            if not attrs.get("email", "").strip():
                raise serializers.ValidationError({"email": "Please enter your email."})
        return attrs


class EnquiryCreateView(generics.CreateAPIView):
    """POST /api/enquiries/  Become a seller, advertise, or customer care message."""
    serializer_class = EnquirySerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [EnquiryThrottle]

    def create(self, request, *args, **kwargs):
        if request.data.get("website"):  # a bot filled the hidden field: pretend it worked
            return Response({"status": "received"}, status=201)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data.pop("website", None)
        Enquiry.objects.create(**data)
        return Response({"status": "received"}, status=201)
