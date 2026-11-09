from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from accounts.views import RegisterView, LoginView, RefreshView, MeView, LogoutView
from tour.views import EnterpriseViewSet, LocationViewSet, HotspotViewSet, RouteViewSet, RouteStepViewSet, MediaViewSet
from processes.views import ProcessViewSet, StageViewSet, ResourceViewSet, MetricViewSet, MetricValueViewSet, CaseViewSet
from analytics.views import EventView, DashboardView


def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception:
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ok'})

router = DefaultRouter()
for prefix, view in [('enterprises', EnterpriseViewSet), ('locations', LocationViewSet), ('hotspots', HotspotViewSet),
    ('routes', RouteViewSet), ('route-steps', RouteStepViewSet), ('media', MediaViewSet),
    ('processes', ProcessViewSet), ('stages', StageViewSet), ('resources', ResourceViewSet),
    ('metrics', MetricViewSet), ('metric-values', MetricValueViewSet), ('cases', CaseViewSet)]:
    router.register(prefix, view)
urlpatterns = [
    path('admin/', admin.site.urls), path('api/', include(router.urls)), path('api/health/', health),
    path('api/auth/register/', RegisterView.as_view()), path('api/auth/login/', LoginView.as_view()),
    path('api/auth/refresh/', RefreshView.as_view()), path('api/auth/logout/', LogoutView.as_view()),
    path('api/auth/me/', MeView.as_view()), path('api/events/', EventView.as_view()),
    path('api/dashboard/', DashboardView.as_view()), path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
