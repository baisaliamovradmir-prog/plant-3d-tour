from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from analytics.models import TourEvent

class Command(BaseCommand):
    help = 'Удаляет события старше заданного числа дней (по умолчанию 90).'
    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=90)
    def handle(self, *args, **options):
        if options['days'] < 1:
            raise CommandError('days должно быть положительным.')
        deleted, _ = TourEvent.objects.filter(created_at__lt=timezone.now() - timedelta(days=options['days'])).delete()
        self.stdout.write(f'Удалено событий: {deleted}')
