from django.db.models import Q
from config.views import ContentViewSet
from accounts.permissions import can_edit
from .models import Enterprise, Location, Hotspot, Route, RouteStep, Media
from .serializers import EnterpriseSerializer, LocationSerializer, HotspotSerializer, RouteSerializer, RouteStepSerializer, MediaSerializer

class EnterpriseViewSet(ContentViewSet):
    queryset = Enterprise.objects.order_by('id')
    serializer_class = EnterpriseSerializer

class LocationViewSet(ContentViewSet):
    queryset = Location.objects.select_related('enterprise').prefetch_related('hotspots')
    serializer_class = LocationSerializer
    filter_fields = ('enterprise',)

class HotspotViewSet(ContentViewSet):
    queryset = Hotspot.objects.select_related('location', 'stage__process', 'case__metric', 'target_location').prefetch_related('media')
    serializer_class = HotspotSerializer
    filter_fields = ('location', 'status')
    def get_queryset(self):
        qs = super().get_queryset()
        return qs if can_edit(self.request.user) else qs.filter(status='published')

class RouteViewSet(ContentViewSet):
    queryset = Route.objects.select_related('enterprise').prefetch_related('steps')
    serializer_class = RouteSerializer
    filter_fields = ('enterprise', 'audience')
    def get_queryset(self):
        qs = super().get_queryset()
        return qs if can_edit(self.request.user) else qs.filter(is_published=True)

class RouteStepViewSet(ContentViewSet):
    queryset = RouteStep.objects.select_related('route', 'location', 'hotspot')
    serializer_class = RouteStepSerializer
    filter_fields = ('route',)
    def get_queryset(self):
        qs = super().get_queryset()
        return qs if can_edit(self.request.user) else qs.filter(route__is_published=True).filter(Q(hotspot__isnull=True) | Q(hotspot__status='published'))

class MediaViewSet(ContentViewSet):
    queryset = Media.objects.select_related('hotspot')
    serializer_class = MediaSerializer
    filter_fields = ('hotspot',)
    def get_queryset(self):
        qs = super().get_queryset()
        return qs if can_edit(self.request.user) else qs.filter(hotspot__status='published')
