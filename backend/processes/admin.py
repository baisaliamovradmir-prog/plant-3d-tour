from django.contrib import admin
from tour.admin import ContentAdmin
from .models import Process, ProcessStage, Resource, Metric, MetricValue, Case

@admin.register(Process, ProcessStage, Resource, Metric, MetricValue, Case)
class ProcessContentAdmin(ContentAdmin):
    def get_readonly_fields(self, request, obj=None):
        if obj:
            return tuple(f.name for f in self.model._meta.fields if f.name in {'enterprise', 'process', 'location', 'resource'})
        return ()
