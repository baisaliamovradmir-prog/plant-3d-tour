from rest_framework import serializers
from config.serializers import ValidatedModelSerializer
from accounts.permissions import can_edit
from processes.serializers import StageSerializer, CaseSerializer
from .models import Enterprise, Location, Hotspot, Media, Route, RouteStep

class EnterpriseSerializer(ValidatedModelSerializer):
    class Meta:
        model = Enterprise
        fields = '__all__'

class MediaSerializer(ValidatedModelSerializer):
    url = serializers.FileField(source='file', read_only=True)
    class Meta:
        model = Media
        fields = ['id', 'hotspot', 'media_type', 'file', 'url', 'caption']
        extra_kwargs = {'file': {'write_only': True}}

class HotspotSerializer(ValidatedModelSerializer):
    media = MediaSerializer(many=True, read_only=True)
    stage_detail = StageSerializer(source='stage', read_only=True)
    case_detail = CaseSerializer(source='case', read_only=True)
    class Meta:
        model = Hotspot
        fields = ['id', 'location', 'title', 'description', 'kind', 'status', 'yaw', 'pitch',
                  'pos_x', 'pos_y', 'pos_z', 'stage', 'case', 'target_location', 'media', 'stage_detail', 'case_detail']

class LocationSerializer(ValidatedModelSerializer):
    immutable_links = ('enterprise',)
    asset_url = serializers.FileField(source='asset', read_only=True)
    preview_url = serializers.FileField(source='preview', read_only=True)
    hotspots = serializers.SerializerMethodField()
    class Meta:
        model = Location
        fields = ['id', 'enterprise', 'name', 'description', 'scene_type', 'asset', 'preview',
                  'asset_url', 'preview_url', 'map_x', 'map_y', 'sort_order', 'hotspots']
        extra_kwargs = {'asset': {'write_only': True}, 'preview': {'write_only': True}}
    def get_hotspots(self, obj) -> list[dict]:
        qs = obj.hotspots.all()
        request = self.context.get('request')
        if not request or not can_edit(request.user):
            qs = qs.filter(status='published')
        return HotspotSerializer(qs, many=True, context=self.context).data

class RouteStepSerializer(ValidatedModelSerializer):
    class Meta:
        model = RouteStep
        fields = ['id', 'route', 'step_no', 'location', 'hotspot', 'narration']

class RouteSerializer(ValidatedModelSerializer):
    immutable_links = ('enterprise',)
    steps = serializers.SerializerMethodField()
    step_count = serializers.SerializerMethodField()
    class Meta:
        model = Route
        fields = ['id', 'enterprise', 'name', 'audience', 'description', 'duration_minutes', 'is_published', 'step_count', 'steps']
    def visible_steps(self, obj):
        from django.db.models import Q
        qs = obj.steps.all()
        request = self.context.get('request')
        return qs if request and can_edit(request.user) else qs.filter(Q(hotspot__isnull=True) | Q(hotspot__status='published'))
    def get_steps(self, obj) -> list[dict]:
        return RouteStepSerializer(self.visible_steps(obj), many=True).data
    def get_step_count(self, obj) -> int:
        return self.visible_steps(obj).count()
