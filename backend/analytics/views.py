from datetime import timedelta
from collections import Counter
from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiParameter
from accounts.permissions import ManagerPermission
from processes.models import Process
from processes.serializers import CaseSerializer, MetricValueSerializer
from processes.views import date_range
from tour.models import Route
from .models import TourEvent
from .serializers import EventSerializer, DashboardSerializer

class EventView(generics.CreateAPIView):
    serializer_class = EventSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'events'

class DashboardView(generics.GenericAPIView):
    permission_classes = [ManagerPermission]
    serializer_class = DashboardSerializer
    @extend_schema(parameters=[OpenApiParameter('process', int, required=True), OpenApiParameter('from', str), OpenApiParameter('to', str)])
    def get(self, request):
        try:
            process_id = int(request.query_params.get('process', ''))
        except ValueError:
            raise serializers.ValidationError({'process': 'Укажите ID процесса.'})
        process = generics.get_object_or_404(Process, pk=process_id)
        dates = date_range(request.query_params)
        end = dates.get('to', timezone.localdate())
        start = dates.get('from', end - timedelta(days=89))
        if start > end or (end - start).days > 366:
            raise serializers.ValidationError({'from': 'Период должен составлять от 1 до 367 дней.'})
        metrics = []
        for metric in process.metrics.filter(stage__isnull=True):
            values = metric.values.filter(measured_on__range=(start, end))
            metrics.append({'id': metric.pk, 'code': metric.code, 'name': metric.name, 'unit': metric.unit,
                'better': metric.better, 'latest': MetricValueSerializer(values.last()).data if values.exists() else None,
                'history': MetricValueSerializer(values, many=True).data})
        # Direction B: descriptive heuristic from observed stage durations, not a simulation.
        candidates = []
        for stage in process.stages.all():
            metric = stage.metrics.filter(code='stage_duration').first()
            value = metric.values.filter(measured_on__range=(start, end)).last() if metric else None
            if value:
                candidates.append((value.value, stage, value.measured_on))
        bottleneck = None
        if candidates:
            duration, stage, measured_on = max(candidates, key=lambda row: row[0])
            bottleneck = {'stage': stage.pk, 'name': stage.name, 'duration_h': duration, 'measured_on': measured_on,
                'method': 'max_latest_stage_duration', 'location': stage.location_id,
                'hotspot_ids': list(stage.hotspots.filter(status='published').values_list('id', flat=True))}
        events = TourEvent.objects.filter(route__enterprise=process.enterprise, created_at__date__range=(start, end))
        popular = list(events.filter(event_type='open', hotspot__status='published').values('hotspot_id', 'hotspot__title', 'hotspot__location_id').annotate(views=Count('id')).order_by('-views', 'hotspot_id')[:10])
        routes = []
        for route in Route.objects.filter(enterprise=process.enterprise, is_published=True):
            route_events = events.filter(route=route)
            starts = set(route_events.filter(event_type='open', hotspot__isnull=True).values_list('session_id', flat=True))
            finishes = set(route_events.filter(event_type='finish').values_list('session_id', flat=True))
            completed = starts & finishes
            last_points = {}
            for event in route_events.filter(event_type='open', hotspot__status='published').order_by('created_at', 'id'):
                if event.session_id in starts - finishes:
                    last_points[event.session_id] = event.hotspot_id
            dropoffs = [{'hotspot': key, 'sessions': value} for key, value in Counter(last_points.values()).most_common()]
            routes.append({'route': route.pk, 'name': route.name, 'started_sessions': len(starts),
                'finished_sessions': len(completed), 'unfinished_sessions': len(starts - finishes),
                'dropoff_hotspots': dropoffs,
                'completion_rate': round(len(completed) / len(starts) * 100, 2) if starts else None})
        return Response({'process': process.pk, 'period': {'from': start, 'to': end}, 'metrics': metrics,
            'bottleneck': bottleneck, 'cases': CaseSerializer(process.enterprise.cases.filter(metric__process=process), many=True).data,
            'analytics': {'popular_hotspots': popular, 'routes': routes}})
