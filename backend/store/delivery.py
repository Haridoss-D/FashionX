"""Estimated delivery dates. Change the two numbers to match how fast you really ship."""
from datetime import timedelta

from django.utils import timezone

MIN_DAYS = 3   # earliest delivery, counted from the order date
MAX_DAYS = 6   # latest delivery (this is the "Deliver by" date)
SKIP_WEEKDAY = 6  # Sunday is not counted (Monday is 0)


def add_days(start, days):
    day = start
    while days > 0:
        day += timedelta(days=1)
        if day.weekday() != SKIP_WEEKDAY:
            days -= 1
    return day


def delivery_window(start=None):
    start = start or timezone.localdate()
    return add_days(start, MIN_DAYS), add_days(start, MAX_DAYS)
