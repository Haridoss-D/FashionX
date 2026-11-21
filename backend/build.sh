#!/usr/bin/env bash
# Runs on Render at every deploy
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Free Render plans have no shell, so the admin login is created here from the
# DJANGO_SUPERUSER_* variables. If it already exists this step is skipped.
python manage.py createsuperuser --noinput || true

# First deploy only: set SEED_DEMO=true to add the demo categories and products
if [ "$SEED_DEMO" = "true" ]; then
  python manage.py seed_products
fi