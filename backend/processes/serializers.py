from rest_framework import serializers
from config.serializers import ValidatedModelSerializer
from .models import Process, ProcessStage, Resource, Metric, MetricValue, Case

class MetricValueSerializer(ValidatedModelSerializer):
    class Meta:
        model = MetricValue
        fields = ['id', 'metric', 'measured_on', 'value']

class MetricSerializer(ValidatedModelSerializer):
    immutable_links = ('process',)
    latest = serializers.SerializerMethodField()
    class Meta:
        model = Metric
        fields = ['id', 'process', 'stage', 'code', 'name', 'unit', 'better', 'latest']
    def get_latest(self, obj) -> dict | None:
        value = obj.values.order_by('-measured_on').first()
        return MetricValueSerializer(value).data if value else None

class StageSerializer(ValidatedModelSerializer):
    immutable_links = ('process', 'location', 'resource')
    metrics = MetricSerializer(many=True, read_only=True)
    hotspot_ids = serializers.SerializerMethodField()
    class Meta:
        model = ProcessStage
        fields = ['id', 'process', 'location', 'resource', 'step_no', 'name', 'duration_h', 'cost_rub', 'metrics', 'hotspot_ids']
    def get_hotspot_ids(self, obj) -> list[int]:
        return list(obj.hotspots.filter(status='published').values_list('id', flat=True))

class ProcessSerializer(ValidatedModelSerializer):
    immutable_links = ('enterprise',)
    stages = StageSerializer(many=True, read_only=True)
    metrics = serializers.SerializerMethodField()
    class Meta:
        model = Process
        fields = ['id', 'enterprise', 'name', 'description', 'stages', 'metrics']
    def get_metrics(self, obj) -> list[dict]:
        return MetricSerializer(obj.metrics.filter(stage__isnull=True), many=True).data

class ResourceSerializer(ValidatedModelSerializer):
    immutable_links = ('location',)
    class Meta:
        model = Resource
        fields = '__all__'

class CaseSerializer(ValidatedModelSerializer):
    immutable_links = ('enterprise',)
    metric_detail = MetricSerializer(source='metric', read_only=True)
    improvement_percent = serializers.SerializerMethodField()
    tour_links = serializers.SerializerMethodField()
    class Meta:
        model = Case
        fields = ['id', 'enterprise', 'metric', 'metric_detail', 'title', 'problem', 'solution',
                  'value_before', 'value_after', 'improvement_percent', 'tour_links']
    def get_improvement_percent(self, obj) -> float | None:
        if not obj.value_before:
            return None
        direction = 1 if obj.metric.better == 'higher' else -1
        return round(direction * (obj.value_after - obj.value_before) / obj.value_before * 100, 2)
    def get_tour_links(self, obj) -> list[dict]:
        return list(obj.hotspots.filter(status='published').values('id', 'location_id'))
