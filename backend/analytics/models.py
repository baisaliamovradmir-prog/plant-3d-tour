from django.db import models

class TourEvent(models.Model):
    session_id = models.UUIDField(db_index=True)
    route = models.ForeignKey('tour.Route', on_delete=models.CASCADE, related_name='events')
    hotspot = models.ForeignKey('tour.Hotspot', on_delete=models.SET_NULL, null=True, blank=True, related_name='events')
    event_type = models.CharField(max_length=10, choices=[('open', 'Просмотр'), ('finish', 'Завершение')])
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['route', 'event_type', 'created_at'])]
