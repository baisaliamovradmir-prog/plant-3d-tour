from pathlib import Path
from django.apps import apps
from django.core import serializers
from django.core.management.base import BaseCommand
from .import_content import MODEL_ORDER

class Command(BaseCommand):
    help = 'Экспортирует контент в JSON fixture без аккаунтов, токенов и событий.'
    def add_arguments(self, parser):
        parser.add_argument('path')
    def handle(self, *args, **options):
        objects = []
        for label in MODEL_ORDER:
            objects.extend(apps.get_model(label).objects.order_by('pk'))
        destination = Path(options['path'])
        # Fail instead of accidentally replacing an existing export.
        with destination.open('x', encoding='utf-8') as stream:
            serializers.serialize('json', objects, indent=2, ensure_ascii=False, stream=stream)
        self.stdout.write(f'Экспортировано записей: {len(objects)}. Файлы MEDIA_ROOT копируйте отдельно.')
