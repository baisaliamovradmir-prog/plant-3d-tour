from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from tour.validators import finite

class Process(models.Model):
    enterprise = models.ForeignKey('tour.Enterprise', on_delete=models.PROTECT, related_name='processes')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    class Meta:
        ordering = ['id']
    def __str__(self):
        return self.name

class Resource(models.Model):
    location = models.ForeignKey('tour.Location', on_delete=models.PROTECT, related_name='resources')
    name = models.CharField(max_length=200)
    resource_type = models.CharField(max_length=12, choices=[('equipment', 'Оборудование'), ('staff', 'Персонал'), ('storage', 'Склад')])
    capacity = models.FloatField(validators=[finite, MinValueValidator(0.001)])
    capacity_unit = models.CharField(max_length=40, default='ед./ч')
    class Meta:
        ordering = ['id']
    def __str__(self):
        return self.name

class ProcessStage(models.Model):
    process = models.ForeignKey(Process, on_delete=models.PROTECT, related_name='stages')
    location = models.ForeignKey('tour.Location', on_delete=models.PROTECT, related_name='stages')
    resource = models.ForeignKey(Resource, on_delete=models.PROTECT, related_name='stages')
    step_no = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    name = models.CharField(max_length=200)
    duration_h = models.FloatField(validators=[finite, MinValueValidator(0)])
    cost_rub = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])
    class Meta:
        ordering = ['step_no', 'id']
        constraints = [models.UniqueConstraint(fields=['process', 'step_no'], name='unique_process_step')]
    def clean(self):
        if self.process_id and self.location_id and self.process.enterprise_id != self.location.enterprise_id:
            raise ValidationError({'location': 'Локация другого предприятия.'})
        if self.resource_id and self.resource.location_id != self.location_id:
            raise ValidationError({'resource': 'Ресурс находится в другой локации.'})
        if self.pk and self.hotspots.exclude(location_id=self.location_id).exists():
            raise ValidationError({'location': 'Локация не совпадает с привязанными точками.'})
    def __str__(self):
        return self.name

class Metric(models.Model):
    process = models.ForeignKey(Process, on_delete=models.PROTECT, related_name='metrics')
    stage = models.ForeignKey(ProcessStage, on_delete=models.PROTECT, null=True, blank=True, related_name='metrics')
    code = models.CharField(max_length=32, choices=[(x, x) for x in ['cycle_time', 'output', 'utilization', 'cost', 'stage_duration']])
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=40)
    better = models.CharField(max_length=10, choices=[('lower', 'Меньше'), ('higher', 'Больше')])
    class Meta:
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(fields=['process', 'code'], condition=models.Q(stage__isnull=True), name='unique_process_metric'),
            models.UniqueConstraint(fields=['stage', 'code'], condition=models.Q(stage__isnull=False), name='unique_stage_metric'),
        ]
    def clean(self):
        if self.stage_id and self.stage.process_id != self.process_id:
            raise ValidationError({'stage': 'Этап другого процесса.'})
    def __str__(self):
        return self.name

class MetricValue(models.Model):
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name='values')
    measured_on = models.DateField()
    value = models.FloatField(validators=[finite, MinValueValidator(0)])
    class Meta:
        ordering = ['measured_on', 'id']
        constraints = [models.UniqueConstraint(fields=['metric', 'measured_on'], name='unique_daily_metric')]
    def clean(self):
        if self.metric_id and self.metric.code == 'utilization' and self.value is not None and self.value > 100:
            raise ValidationError({'value': 'Загрузка в процентах должна быть от 0 до 100.'})

class Case(models.Model):
    enterprise = models.ForeignKey('tour.Enterprise', on_delete=models.PROTECT, related_name='cases')
    metric = models.ForeignKey(Metric, on_delete=models.PROTECT, related_name='cases')
    title = models.CharField(max_length=200)
    problem = models.TextField()
    solution = models.TextField()
    value_before = models.FloatField(validators=[finite, MinValueValidator(0)])
    value_after = models.FloatField(validators=[finite, MinValueValidator(0)])
    class Meta:
        ordering = ['id']
    def clean(self):
        if self.metric_id and self.enterprise_id != self.metric.process.enterprise_id:
            raise ValidationError({'metric': 'Метрика другого предприятия.'})
    def __str__(self):
        return self.title
