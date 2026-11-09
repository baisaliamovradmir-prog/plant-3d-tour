from django.contrib import admin
from .models import TourEvent

@admin.register(TourEvent)
class EventAdmin(admin.ModelAdmin):
    list_display = ('id', 'session_id', 'route', 'hotspot', 'event_type', 'created_at')
    list_filter = ('event_type', 'route')
    readonly_fields = ('session_id', 'route', 'hotspot', 'event_type', 'created_at')
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
