from rest_framework import serializers
from .models import TourEvent

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourEvent
        fields = ['id', 'session_id', 'route', 'hotspot', 'event_type', 'created_at']
        read_only_fields = ['id', 'created_at']
    def validate(self, attrs):
        route = attrs['route']
        hotspot = attrs.get('hotspot')
        if not route.is_published:
            raise serializers.ValidationError({'route': 'Маршрут не опубликован.'})
        if hotspot and (hotspot.status != 'published' or not route.steps.filter(hotspot=hotspot).exists()):
            raise serializers.ValidationError({'hotspot': 'Точка не входит в опубликованный маршрут.'})
        if attrs['event_type'] == 'finish' and hotspot:
            raise serializers.ValidationError({'hotspot': 'Завершение относится ко всему маршруту; передайте null.'})
        return attrs

class DashboardSerializer(serializers.Serializer):
    process = serializers.IntegerField()
    period = serializers.DictField()
    metrics = serializers.ListField(child=serializers.DictField())
    bottleneck = serializers.DictField(allow_null=True)
    cases = serializers.ListField(child=serializers.DictField())
    analytics = serializers.DictField()
