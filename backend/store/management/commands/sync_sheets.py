import time

from django.core.management.base import BaseCommand

from store import sheets
from store.models import Order


class Command(BaseCommand):
    help = "Copies orders to Google Sheets. By default only the ones not copied yet."

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", help="Re-copy every order")

    def handle(self, *args, **options):
        if not sheets.is_configured():
            self.stderr.write("Google Sheets is not set up. Check GOOGLE_SHEET_ID and the service account key in .env")
            return
        orders = Order.objects.order_by("created_at")
        if not options["all"]:
            orders = orders.filter(synced_to_sheet=False)

        done = skipped = failed = 0
        for order in orders:
            try:
                if sheets.sync_order(order.pk):
                    done += 1
                else:
                    skipped += 1
                time.sleep(2)  # stay under Google's per-minute limit
            except Exception as exc:
                failed += 1
                self.stderr.write(f"{order.order_number}: {exc}")
        self.stdout.write(self.style.SUCCESS(f"Copied {done}, skipped {skipped} (unpaid online), failed {failed}."))
