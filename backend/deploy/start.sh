#!/bin/sh
set -eu
python manage.py migrate --noinput
python manage.py collectstatic --noinput
if [ "${SEED_DEMO:-false}" = "true" ]; then
    if [ -n "${DEMO_PASSWORD:-}" ]; then
        python manage.py seed_demo --with-users
    else
        python manage.py seed_demo
    fi
fi
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 60 --error-logfile -
