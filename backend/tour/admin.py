from django.contrib import admin
from .models import Enterprise, Location, Hotspot, Media, Route, RouteStep

class ContentAdmin(admin.ModelAdmin):
    list_per_page = 50
    # Avoid moving parent objects with existing dependent links to another enterprise/location.
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return tuple(f.name for f in self.model._meta.fields if f.name in {'enterprise'})
        return ()

@admin.register(Enterprise)
class EnterpriseAdmin(ContentAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

@admin.register(Location)
class LocationAdmin(ContentAdmin):
    list_display = ('id', 'name', 'enterprise', 'scene_type')
    list_filter = ('enterprise', 'scene_type')
    search_fields = ('name',)

@admin.register(Hotspot)
class HotspotAdmin(ContentAdmin):
    list_display = ('id', 'title', 'location', 'kind', 'status')
    list_filter = ('status', 'kind', 'location')
    search_fields = ('title', 'description')

@admin.register(Route)
class RouteAdmin(ContentAdmin):
    list_display = ('id', 'name', 'audience', 'is_published')
    list_filter = ('audience', 'is_published')

@admin.register(RouteStep)
class RouteStepAdmin(ContentAdmin):
    list_display = ('route', 'step_no', 'location', 'hotspot')
    list_filter = ('route',)

@admin.register(Media)
class MediaAdmin(ContentAdmin):
    list_display = ('id', 'hotspot', 'media_type', 'caption')
