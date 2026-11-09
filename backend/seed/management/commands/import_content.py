import csv
import json
from pathlib import Path
from django.apps import apps
from django.core import serializers
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection, IntegrityError
from django.core.management.color import no_style
from processes.models import MetricValue

MODEL_ORDER = ['tour.enterprise', 'tour.location', 'processes.process', 'processes.resource',
    'processes.processstage', 'processes.metric', 'processes.metricvalue', 'processes.case',
    'tour.hotspot', 'tour.media', 'tour.route', 'tour.routestep']
ALLOWED = set(MODEL_ORDER)

class Command(BaseCommand):
    help = 'Атомарный импорт JSON fixture в пустые ID или CSV metric_id,measured_on,value. Без пользователей и событий.'
    def add_arguments(self, parser):
        parser.add_argument('path')
        parser.add_argument('--dry-run', action='store_true')
    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                path = Path(options['path'])
                count = 0
                if path.suffix.lower() == '.csv':
                    with path.open(encoding='utf-8-sig', newline='') as stream:
                        reader = csv.DictReader(stream)
                        if set(reader.fieldnames or []) != {'metric_id', 'measured_on', 'value'}:
                            raise CommandError('CSV: нужны ровно metric_id,measured_on,value.')
                        for row in reader:
                            obj = MetricValue(metric_id=int(row['metric_id']), measured_on=row['measured_on'], value=float(row['value']))
                            obj.full_clean()
                            obj.save()
                            count += 1
                else:
                    data = json.loads(path.read_text(encoding='utf-8'))
                    if not isinstance(data, list) or any(not isinstance(row, dict) or row.get('model') not in ALLOWED for row in data):
                        raise CommandError('JSON должен быть массивом разрешённых Django fixture объектов контента.')
                    data.sort(key=lambda row: MODEL_ORDER.index(row['model']))
                    touched = set()
                    for wrapper in serializers.deserialize('json', json.dumps(data)):
                        obj = wrapper.object
                        if obj.pk and type(obj).objects.filter(pk=obj.pk).exists():
                            raise CommandError(f'ID уже занят: {obj._meta.label}:{obj.pk}. Импорт не перезаписывает данные.')
                        obj.clean_fields()  # Reject invalid FK IDs before model.clean dereferences them.
                        obj.full_clean()
                        obj.save()
                        touched.add(type(obj))
                        count += 1
                    with connection.cursor() as cursor:
                        for sql in connection.ops.sequence_reset_sql(no_style(), list(touched)):
                            cursor.execute(sql)
                if options['dry_run']:
                    transaction.set_rollback(True)
                self.stdout.write(f'Проверено записей: {count}. ' + ('Изменения отменены (dry-run).' if options['dry_run'] else 'Импорт завершён.'))
        except (OSError, ValueError, ValidationError, ObjectDoesNotExist, IntegrityError, serializers.base.DeserializationError) as exc:
            raise CommandError(str(exc))
