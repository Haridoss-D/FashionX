"""Copies orders and customers into a Google Sheet.

The database stays the source of truth. The sheet is a readable copy for you,
so a Google outage or a wrong setting never stops a customer from ordering.
"""
import logging
import threading
from pathlib import Path

from django.conf import settings
from django.db import connection
from django.db.models import Sum
from django.utils import timezone

from .models import Order

log = logging.getLogger(__name__)

ORDER_HEADERS = [
    "Order #", "Date", "Customer", "Email", "Phone", "Address", "City", "State", "PIN",
    "Items", "Payment Method", "Payment Status", "Order Status", "Subtotal", "Shipping", "Total",
]
CUSTOMER_HEADERS = [
    "Phone", "Name", "Email", "Address", "City", "State", "PIN",
    "Orders", "Total Spent", "First Order", "Last Order",
]

_lock = threading.Lock()  # one sheet update at a time, so rows are never duplicated
_state = {"sheet": None, "ready": set()}


def is_configured():
    return bool(
        settings.GOOGLE_SHEET_ID
        and (settings.GOOGLE_SERVICE_ACCOUNT_JSON or settings.GOOGLE_SERVICE_ACCOUNT_FILE)
    )


def _spreadsheet():
    if _state["sheet"] is None:
        import json

        import gspread

        if settings.GOOGLE_SERVICE_ACCOUNT_JSON:
            client = gspread.service_account_from_dict(json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON))
        else:
            path = Path(settings.GOOGLE_SERVICE_ACCOUNT_FILE)
            if not path.is_absolute():
                path = Path(settings.BASE_DIR) / path
            client = gspread.service_account(filename=str(path))
        _state["sheet"] = client.open_by_key(settings.GOOGLE_SHEET_ID)
    return _state["sheet"]


def _worksheet(title, headers):
    import gspread

    sheet = _spreadsheet()
    try:
        ws = sheet.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = sheet.add_worksheet(title=title, rows=1000, cols=len(headers))
        _state["ready"].discard(title)  # new tab: it needs its header row
    if title not in _state["ready"]:
        if ws.row_values(1) != headers:
            ws.update(values=[headers], range_name="A1")
            ws.freeze(rows=1)
        _state["ready"].add(title)
    return ws


def _upsert(ws, key, row):
    """Updates the row whose first column equals key, or adds a new row."""
    keys = ws.col_values(1)
    if key in keys:
        ws.update(values=[row], range_name=f"A{keys.index(key) + 1}", value_input_option="RAW")
    else:
        # RAW: text stays text, so a name like "=HYPERLINK(...)" is never run as a formula
        ws.append_row(row, value_input_option="RAW")


def should_sync(order):
    """COD orders at once; online orders only after the payment succeeds."""
    return order.payment_method == Order.Payment.COD or order.payment_status == Order.PaymentStatus.PAID


def _stamp(dt):
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M")


def order_row(order):
    items = "; ".join(
        f"{i.name} ({', '.join(x for x in (i.color, i.size) if x)}) x{i.quantity}".replace(" ()", "")
        for i in order.items.all()
    )
    return [
        order.order_number, _stamp(order.created_at), order.full_name, order.email, order.phone,
        order.address, order.city, order.state, order.pin_code, items,
        order.get_payment_method_display(), order.get_payment_status_display(), order.get_status_display(),
        float(order.subtotal), float(order.shipping), float(order.total),
    ]


def customer_row(order):
    mine = [o for o in Order.objects.filter(phone=order.phone).exclude(status=Order.Status.CANCELLED) if should_sync(o)]
    if not mine:
        mine = [order]
    mine.sort(key=lambda o: o.created_at)
    return [
        order.phone, order.full_name, order.email, order.address, order.city, order.state, order.pin_code,
        len(mine), float(sum(o.total for o in mine)), _stamp(mine[0].created_at), _stamp(mine[-1].created_at),
    ]


def sync_order(order_id):
    """Blocking. Returns True if the order was written to the sheet."""
    order = Order.objects.prefetch_related("items").get(pk=order_id)
    if not should_sync(order):
        return False
    with _lock:
        _upsert(_worksheet("Orders", ORDER_HEADERS), order.order_number, order_row(order))
        _upsert(_worksheet("Customers", CUSTOMER_HEADERS), order.phone, customer_row(order))
    Order.objects.filter(pk=order.pk).update(synced_to_sheet=True)  # update() sends no signal
    return True


def sync_async(order_id):
    """Runs in the background so checkout never waits for Google."""
    def run():
        try:
            sync_order(order_id)
        except Exception:
            log.exception("Google Sheets sync failed for order id %s. Run: python manage.py sync_sheets", order_id)
        finally:
            connection.close()

    threading.Thread(target=run, daemon=True).start()
