from pathlib import Path
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from .validators import finite, validate_asset


def upload_path(instance, filename):
    return f'assets/{uuid.uuid4().hex}{Path(filename).suffix.lower()}'

class Enterprise(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    def __str__(self):
        return self.name

class Location(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.PROTECT, related_name='locations')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    scene_type = models.CharField(max_length=12, choices=[('overview', 'Генплан'), ('panorama', 'Панорама'), ('model', '3D')])
    asset = models.FileField(upload_to=upload_path, validators=[validate_asset], blank=True)
    preview = models.ImageField(upload_to=upload_path, validators=[validate_asset], blank=True)
    map_x = models.FloatField(default=0, validators=[finite])
    map_y = models.FloatField(default=0, validators=[finite])
    sort_order = models.PositiveIntegerField(default=0)
    class Meta:
        ordering = ['sort_order', 'id']
    def clean(self):
        if self.asset and self.scene_type == 'panorama' and Path(self.asset.name).suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
            raise ValidationError({'asset': 'Для панорамы нужно изображение.'})
        if self.asset and self.scene_type in {'model', 'overview'} and Path(self.asset.name).suffix.lower() != '.glb':
            raise ValidationError({'asset': 'Для модели нужен GLB.'})
    def __str__(self):
        return self.name

class Hotspot(models.Model):
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='hotspots')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=12, choices=[(x, x) for x in ['info', 'process', 'case', 'transition']], default='info')
    status = models.CharField(max_length=12, choices=[(x, x) for x in ['draft', 'published', 'hidden', 'archived']], default='draft')
    yaw = models.FloatField(default=0, validators=[finite, MinValueValidator(-180), MaxValueValidator(180)])
    pitch = models.FloatField(default=0, validators=[finite, MinValueValidator(-90), MaxValueValidator(90)])
    pos_x = models.FloatField(default=0, validators=[finite])
    pos_y = models.FloatField(default=0, validators=[finite])
    pos_z = models.FloatField(default=0, validators=[finite])
    stage = models.ForeignKey('processes.ProcessStage', on_delete=models.PROTECT, null=True, blank=True, related_name='hotspots')
    case = models.ForeignKey('processes.Case', on_delete=models.PROTECT, null=True, blank=True, related_name='hotspots')
    target_location = models.ForeignKey(Location, on_delete=models.PROTECT, null=True, blank=True, related_name='incoming_hotspots')
    class Meta:
        ordering = ['id']
    def clean(self):
        if self.kind == 'process' and not self.stage_id:
            raise ValidationError({'stage': 'Нужен этап процесса.'})
        if self.kind == 'case' and not self.case_id:
            raise ValidationError({'case': 'Нужен кейс.'})
        if self.kind == 'transition' and not self.target_location_id:
            raise ValidationError({'target_location': 'Нужна целевая локация.'})
        if not self.location_id:
            return
        enterprise_id = self.location.enterprise_id
        for field, entity_id in [('stage', self.stage.process.enterprise_id if self.stage_id else None),
                                  ('case', self.case.enterprise_id if self.case_id else None),
                                  ('target_location', self.target_location.enterprise_id if self.target_location_id else None)]:
            if entity_id is not None and entity_id != enterprise_id:
                raise ValidationError({field: 'Связанные объекты должны принадлежать одному предприятию.'})
        if self.stage_id and self.stage.location_id != self.location_id:
            raise ValidationError({'stage': 'Этап должен находиться в локации точки.'})
        if self.pk and self.route_steps.exclude(location_id=self.location_id).exists():
            raise ValidationError({'location': 'Сначала удалите или измените шаги маршрутов, использующие точку.'})
    def __str__(self):
        return self.title

class Media(models.Model):
    hotspot = models.ForeignKey(Hotspot, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(max_length=10, choices=[('image', 'Фото'), ('video', 'Видео'), ('pdf', 'PDF')])
    file = models.FileField(upload_to=upload_path, validators=[validate_asset])
    caption = models.CharField(max_length=250, blank=True)
    class Meta:
        ordering = ['id']
    def clean(self):
        allowed = {'image': {'.jpg', '.jpeg', '.png', '.webp'}, 'video': {'.mp4'}, 'pdf': {'.pdf'}}
        if self.file and Path(self.file.name).suffix.lower() not in allowed.get(self.media_type, set()):
            raise ValidationError({'file': 'Формат не соответствует типу медиа.'})

class Route(models.Model):
    enterprise = models.ForeignKey(Enterprise, on_delete=models.PROTECT, related_name='routes')
    name = models.CharField(max_length=200)
    audience = models.CharField(max_length=20, choices=[('students', 'Абитуриенты'), ('partners', 'Партнёры'), ('employees', 'Сотрудники')])
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=10)
    is_published = models.BooleanField(default=False)
    class Meta:
        ordering = ['id']
    def __str__(self):
        return self.name

class RouteStep(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='steps')
    step_no = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='route_steps')
    hotspot = models.ForeignKey(Hotspot, on_delete=models.PROTECT, null=True, blank=True, related_name='route_steps')
    narration = models.TextField(blank=True)
    class Meta:
        ordering = ['step_no', 'id']
        constraints = [models.UniqueConstraint(fields=['route', 'step_no'], name='unique_route_step')]
    def clean(self):
        if self.location_id and self.route_id and self.location.enterprise_id != self.route.enterprise_id:
            raise ValidationError({'location': 'Локация другого предприятия.'})
        if self.hotspot_id and self.hotspot.location_id != self.location_id:
            raise ValidationError({'hotspot': 'Точка находится в другой локации.'})
