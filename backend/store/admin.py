from django.contrib import admin

from .models import Category, Enquiry, Order, OrderItem, Product, ProductVariant, Review


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class VariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    inlines = [VariantInline]
    list_display = ("name", "category", "price", "stock", "is_featured", "is_active")
    list_filter = ("category", "is_featured", "is_active")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "full_name", "total", "payment_method", "payment_status", "status", "created_at")
    list_filter = ("status", "payment_method", "payment_status")
    search_fields = ("order_number", "full_name", "email", "phone")
    inlines = [OrderItemInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "is_visible", "created_at")
    list_filter = ("is_visible", "rating")
    list_editable = ("is_visible",)
    search_fields = ("product__name", "comment")


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ("kind", "name", "phone", "business", "is_done", "created_at")
    list_filter = ("kind", "is_done")
    list_editable = ("is_done",)
    search_fields = ("name", "phone", "email", "business", "message")
