import os
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from accounts.models import User
from accounts.serializers import POLICY_VERSION
from tour.models import Enterprise, Location, Hotspot, Route, RouteStep
from processes.models import Process, ProcessStage, Resource, Metric, MetricValue, Case

class Command(BaseCommand):
    help = 'Создаёт синтетический завод (90 дней истории). Повторный запуск не перезаписывает данные.'
    def add_arguments(self, parser):
        parser.add_argument('--end-date', type=date.fromisoformat, default=timezone.localdate())
        parser.add_argument('--with-users', action='store_true', help='Пароль задаётся переменной DEMO_PASSWORD.')
    @transaction.atomic
    def handle(self, *args, **options):
        if options['with_users']:
            password = os.getenv('DEMO_PASSWORD')
            if not password:
                raise CommandError('Для --with-users установите DEMO_PASSWORD.')
            try:
                validate_password(password)
            except ValidationError as exc:
                raise CommandError('; '.join(exc.messages))
            for role in ('visitor', 'manager', 'editor', 'admin'):
                if not User.objects.filter(username='demo_' + role).exists():
                    User.objects.create_user(username='demo_' + role, password=password, role=role,
                        email=f'{role}@example.invalid', consent_at=timezone.now(), policy_version=POLICY_VERSION)
        if Enterprise.objects.filter(name='Демо-завод смазочных материалов').exists():
            self.stdout.write('Демо-завод уже существует; данные не изменены.')
            return
        rng = random.Random(42)
        enterprise = Enterprise.objects.create(name='Демо-завод смазочных материалов', description='Все данные синтетические. Направление B.')
        locations = []
        for i, name in enumerate(['Генплан', 'Резервуарный парк', 'Цех смешения', 'Лаборатория ОТК', 'Цех фасовки', 'Склад и отгрузка']):
            locations.append(Location.objects.create(enterprise=enterprise, name=name,
                scene_type='overview' if i == 0 else 'model', map_x=i * 15, map_y=(i % 2) * 20, sort_order=i,
                description='Синтетическая локация; 3D-модель добавляет команда 3D.'))
        process = Process.objects.create(enterprise=enterprise, name='Производство смазочных материалов', description='От приёмки сырья до отгрузки продукции.')
        stages = []
        names = ['Приёмка сырья', 'Хранение', 'Смешение', 'Контроль качества', 'Фасовка', 'Хранение продукции', 'Отгрузка']
        resource_names = ['Сливная эстакада', 'Резервуары', 'Смеситель', 'Анализатор ОТК', 'Линия розлива', 'Стеллажи', 'Погрузчик']
        durations = [1, 2, 3, 6, 2, 1.5, 1]
        metrics = []
        for i, (name, location_index, duration) in enumerate(zip(names, [1, 1, 2, 3, 4, 5, 5], durations)):
            location = locations[location_index]
            resource = Resource.objects.create(location=location, name=resource_names[i],
                resource_type='storage' if i in (1, 5) else 'equipment', capacity=10, capacity_unit='т/ч')
            stage = ProcessStage.objects.create(process=process, location=location, resource=resource,
                step_no=i + 1, name=name, duration_h=duration, cost_rub=1000 * duration)
            stages.append(stage)
            metrics.append((Metric.objects.create(process=process, stage=stage, code='stage_duration', name=f'Длительность: {name}', unit='ч', better='lower'), duration))
        for code, name, unit, better, base in [
            ('cycle_time', 'Время цикла', 'ч', 'lower', sum(durations)), ('output', 'Выпуск', 'т/сут', 'higher', 80),
            ('utilization', 'Загрузка ресурсов', '%', 'higher', 76), ('cost', 'Стоимость партии', 'руб.', 'lower', 16500)]:
            metrics.append((Metric.objects.create(process=process, code=code, name=name, unit=unit, better=better), base))
        metrics.append((Metric.objects.create(process=process, stage=stages[2], code='utilization', name='Загрузка смесителя', unit='%', better='higher'), 82))
        metrics.append((Metric.objects.create(process=process, stage=stages[4], code='output', name='Выпуск фасовки', unit='т/сут', better='higher'), 80))
        values = []
        for metric, base in metrics:
            for offset in range(90):
                values.append(MetricValue(metric=metric, measured_on=options['end_date'] - timedelta(days=89 - offset), value=round(base * rng.uniform(.94, 1.06), 2)))
        MetricValue.objects.bulk_create(values)
        cases = []
        for index, title, problem, solution, before, after in [
            (3, 'Экспресс-анализ проб', 'Очередь проб в ОТК задерживает выпуск партии.', 'Ввести экспресс-анализ типовых проб.', 6, 3),
            (4, 'Быстрая переналадка линии', 'Долгая переналадка тары.', 'Подготовка оснастки до остановки линии.', 2, 1.5),
            (5, 'Порядок на складе по 5S', 'Потери времени при поиске продукции.', 'Адресное хранение и визуальная разметка.', 1.5, 1)]:
            cases.append(Case.objects.create(enterprise=enterprise, metric=metrics[index][0], title=title,
                problem=problem, solution=solution, value_before=before, value_after=after))
        points = []
        point_data = [('Завод сверху', 0, None, None), ('Сливная эстакада', 1, 0, None),
            ('Резервуары', 1, 1, None), ('Смесительная установка', 2, 2, None), ('Отбор проб', 3, 3, 0),
            ('Линия розлива', 4, 4, 1), ('Рабочее место оператора', 4, 4, None),
            ('Адресное хранение', 5, 5, 2), ('Погрузка', 5, 6, None), ('Итоги', 0, None, None)]
        for i, (title, loc, st, cs) in enumerate(point_data):
            points.append(Hotspot.objects.create(location=locations[loc], title=title, description=f'{title}. Учебная точка демонстрационного завода.',
                kind='case' if cs is not None else ('process' if st is not None else 'info'), status='published',
                stage=stages[st] if st is not None else None, case=cases[cs] if cs is not None else None,
                pos_x=(i % 3) * 2, pos_y=1, pos_z=i % 2, yaw=i * 15 - 60))
        for name, audience, indices in [('Знакомство с профессией', 'students', [1, 4, 5, 7, 10]),
            ('Мощности и эффективность', 'partners', [1, 3, 4, 5, 6, 8, 9, 10]),
            ('Первый день на заводе', 'employees', [1, 2, 7, 8, 9])]:
            route = Route.objects.create(enterprise=enterprise, name=name, audience=audience, is_published=True, duration_minutes=len(indices) * 2)
            for order, number in enumerate(indices, 1):
                point = points[number - 1]
                RouteStep.objects.create(route=route, step_no=order, location=point.location, hotspot=point,
                    narration=f'{name}: шаг {order}. {point.title}. ' + {'students': 'Знакомимся с профессией и технологией.', 'partners': 'Обратите внимание на мощности и показатели.', 'employees': 'Изучите рабочее место и правила безопасности.'}[audience])
        self.stdout.write(self.style.SUCCESS('Создано: 6 локаций, 7 этапов, 7 ресурсов, 10 точек, 3 маршрута, 3 кейса, 90 дней метрик.'))
