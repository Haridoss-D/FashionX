from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from store.models import Order
from store.payments import release_order


class Command(BaseCommand):
    help = "Cancels online orders that were never paid and returns their stock."

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=30)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=options["minutes"])
        stale = Order.objects.filter(
            payment_method=Order.Payment.ONLINE,
            payment_status=Order.PaymentStatus.PENDING,
            status=Order.Status.PENDING,
            created_at__lt=cutoff,
        )
        released = sum(1 for order in stale if release_order(order))
        self.stdout.write(self.style.SUCCESS(f"Released {released} unpaid order(s)."))
