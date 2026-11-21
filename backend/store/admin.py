from django.contrib import admin

from .models import Category, Order, OrderItem, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
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
