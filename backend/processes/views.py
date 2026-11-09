from datetime import date
from rest_framework import serializers
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from config.views import ContentViewSet
from .models import Process, ProcessStage, Resource, Metric, MetricValue, Case
from .serializers import ProcessSerializer, StageSerializer, ResourceSerializer, MetricSerializer, MetricValueSerializer, CaseSerializer


def date_range(params):
    values = {}
    for key in ('from', 'to'):
        if params.get(key):
            try:
                values[key] = date.fromisoformat(params[key])
            except ValueError:
                raise serializers.ValidationError({key: 'Дата в формате YYYY-MM-DD.'})
    if len(values) == 2 and values['from'] > values['to']:
        raise serializers.ValidationError({'to': 'Конец периода раньше начала.'})
    return values

class ProcessViewSet(ContentViewSet):
    queryset = Process.objects.select_related('enterprise').prefetch_related('stages', 'metrics')
    serializer_class = ProcessSerializer
    filter_fields = ('enterprise',)

class StageViewSet(ContentViewSet):
    queryset = ProcessStage.objects.select_related('process', 'location', 'resource').prefetch_related('metrics')
    serializer_class = StageSerializer
    filter_fields = ('process', 'location')

class ResourceViewSet(ContentViewSet):
    queryset = Resource.objects.select_related('location')
    serializer_class = ResourceSerializer
    filter_fields = ('location',)

class MetricViewSet(ContentViewSet):
    queryset = Metric.objects.select_related('process', 'stage')
    serializer_class = MetricSerializer
    filter_fields = ('process', 'stage', 'code')
    @extend_schema(parameters=[OpenApiParameter('from', str), OpenApiParameter('to', str)], responses=MetricValueSerializer(many=True))
    @action(detail=True, methods=['get'])
    def values(self, request, pk=None):
        qs = self.get_object().values.all()
        dates = date_range(request.query_params)
        if 'from' in dates:
            qs = qs.filter(measured_on__gte=dates['from'])
        if 'to' in dates:
            qs = qs.filter(measured_on__lte=dates['to'])
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(MetricValueSerializer(page, many=True).data)

class MetricValueViewSet(ContentViewSet):
    queryset = MetricValue.objects.select_related('metric')
    serializer_class = MetricValueSerializer
    filter_fields = ('metric',)

class CaseViewSet(ContentViewSet):
    queryset = Case.objects.select_related('metric__process', 'enterprise')
    serializer_class = CaseSerializer
    filter_fields = ('enterprise', 'metric')
