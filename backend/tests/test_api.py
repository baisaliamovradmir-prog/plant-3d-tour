import io
import json
import tempfile
import uuid
from datetime import timedelta
from pathlib import Path
from django.core.management import call_command
from django.core.management.base import CommandError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase
from accounts.models import User
from tour.models import Enterprise, Location, Hotspot, Route, RouteStep, Media
from processes.models import Metric, MetricValue, ProcessStage
from analytics.models import TourEvent

@override_settings(REST_FRAMEWORK={
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework_simplejwt.authentication.JWTAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination', 'PAGE_SIZE': 50,
    'DEFAULT_THROTTLE_RATES': {'auth': '10000/hour', 'events': '10000/hour'},
    'EXCEPTION_HANDLER': 'config.exceptions.exception_handler',
})
class APITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', stdout=io.StringIO())
        cls.visitor = User.objects.create_user('visitor', password='Testing-strong-9274', role='visitor')
        cls.editor = User.objects.create_user('editor', password='Testing-strong-9274', role='editor')
        cls.manager = User.objects.create_user('manager', password='Testing-strong-9274', role='manager')
        cls.administrator = User.objects.create_user('administrator', password='Testing-strong-9274', role='admin')
        cls.route = Route.objects.get(audience='partners')
        cls.point = Hotspot.objects.get(title='Отбор проб')
        cls.process = cls.point.stage.process

    def setUp(self):
        self.client.force_authenticate(self.visitor)

    def test_authentication_required(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/routes/').status_code, 401)
        self.assertEqual(self.client.get('/api/health/').status_code, 200)

    def test_registration_consent_password_and_no_role_escalation(self):
        self.client.force_authenticate(None)
        payload = {'username': 'newuser', 'email': 'new@example.invalid', 'password': 'Strong-password-5692', 'consent': False, 'role': 'admin', 'is_superuser': True}
        self.assertEqual(self.client.post('/api/auth/register/', payload).status_code, 400)
        payload['consent'] = True
        payload['password'] = '123'
        self.assertEqual(self.client.post('/api/auth/register/', payload).status_code, 400)
        payload['password'] = 'Strong-password-5692'
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(username='newuser')
        self.assertEqual(user.role, 'visitor')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password(payload['password']))
        self.assertIsNotNone(user.consent_at)
        self.assertNotIn('password', response.data)

    def login(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/auth/login/', {'username': 'visitor', 'password': 'Testing-strong-9274'})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_login_refresh_rotation_logout(self):
        tokens = self.login()
        refreshed = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']})
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}).status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + refreshed.data['access'])
        self.assertEqual(self.client.get('/api/auth/me/').data['role'], 'visitor')
        self.assertEqual(self.client.post('/api/auth/logout/', {'refresh': refreshed.data['refresh']}).status_code, 204)
        self.assertEqual(self.client.post('/api/auth/refresh/', {'refresh': refreshed.data['refresh']}).status_code, 401)

    def test_deleting_account_invalidates_access(self):
        tokens = self.login()
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + tokens['access'])
        self.assertEqual(self.client.delete('/api/auth/me/').status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.visitor.pk).exists())
        self.assertEqual(self.client.get('/api/routes/').status_code, 401)

    def test_wrong_password(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/auth/login/', {'username': 'visitor', 'password': 'wrong'}).status_code, 401)

    def test_full_tour_process_metric_flow(self):
        route = self.client.get(f'/api/routes/{self.route.pk}/').data
        self.assertEqual(route['step_count'], 8)
        self.assertEqual([s['step_no'] for s in route['steps']], list(range(1, 9)))
        point = self.client.get(f'/api/hotspots/{self.point.pk}/').data
        self.assertEqual(point['stage_detail']['name'], 'Контроль качества')
        process = self.client.get(f"/api/processes/{point['stage_detail']['process']}/").data
        self.assertEqual(len(process['stages']), 7)
        metric = point['stage_detail']['metrics'][0]['id']
        values = self.client.get(f'/api/metrics/{metric}/values/').data
        self.assertEqual(values['count'], 90)
        self.assertEqual(len(values['results']), 50)
        self.assertIsNotNone(values['next'])
        case = self.client.get(f"/api/cases/{point['case']}/").data
        self.assertEqual(case['improvement_percent'], 50)

    def test_hidden_content_never_leaks_through_nested_reads(self):
        self.point.status = 'hidden'
        self.point.save()
        self.assertEqual(self.client.get(f'/api/hotspots/{self.point.pk}/').status_code, 404)
        location = self.client.get(f'/api/locations/{self.point.location_id}/').data
        self.assertNotIn(self.point.pk, [p['id'] for p in location['hotspots']])
        route = self.client.get(f'/api/routes/{self.route.pk}/').data
        self.assertNotIn(self.point.pk, [s['hotspot'] for s in route['steps']])
        case = self.client.get(f'/api/cases/{self.point.case_id}/').data
        self.assertEqual(case['tour_links'], [])
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.get(f'/api/hotspots/{self.point.pk}/').status_code, 200)

    def test_unpublished_routes_and_steps_hidden(self):
        self.route.is_published = False
        self.route.save()
        self.assertEqual(self.client.get(f'/api/routes/{self.route.pk}/').status_code, 404)
        steps = self.client.get(f'/api/route-steps/?route={self.route.pk}').data
        self.assertEqual(steps['count'], 0)

    def test_visitor_cannot_write_any_content(self):
        for resource in ['enterprises', 'locations', 'hotspots', 'routes', 'route-steps', 'media', 'processes', 'stages', 'resources', 'metrics', 'metric-values', 'cases']:
            self.assertEqual(self.client.post(f'/api/{resource}/', {}, format='json').status_code, 403, resource)
        self.assertEqual(self.client.patch(f'/api/hotspots/{self.point.pk}/', {'title': 'Changed'}).status_code, 403)
        self.assertEqual(self.client.delete(f'/api/hotspots/{self.point.pk}/').status_code, 403)

    def test_editor_crud_and_protected_delete(self):
        self.client.force_authenticate(self.editor)
        data = {'location': self.point.location_id, 'title': 'Новая точка', 'kind': 'info', 'status': 'draft', 'pos_x': 4}
        response = self.client.post('/api/hotspots/', data, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        url = f"/api/hotspots/{response.data['id']}/"
        self.assertEqual(self.client.patch(url, {'status': 'published', 'pos_x': 9}, format='json').status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.delete(f'/api/hotspots/{self.point.pk}/').status_code, 409)

    def test_partial_update_validates_coordinates_and_stage(self):
        self.client.force_authenticate(self.editor)
        url = f'/api/hotspots/{self.point.pk}/'
        self.assertEqual(self.client.patch(url, {'pitch': 91}, format='json').status_code, 400)
        wrong = ProcessStage.objects.exclude(location=self.point.location).first()
        self.assertEqual(self.client.patch(url, {'stage': wrong.pk}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(url, {'location': wrong.location_id}, format='json').status_code, 400)

    def test_cross_enterprise_links_rejected(self):
        self.client.force_authenticate(self.editor)
        enterprise = Enterprise.objects.create(name='Другой завод')
        location = Location.objects.create(enterprise=enterprise, name='Цех', scene_type='model')
        response = self.client.post('/api/hotspots/', {'title': 'test', 'location': location.pk, 'kind': 'case', 'case': self.point.case_id}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.client.patch(f'/api/locations/{self.point.location_id}/', {'enterprise': enterprise.pk}).status_code, 400)

    def test_invalid_foreign_key_and_route_step(self):
        self.client.force_authenticate(self.editor)
        self.assertEqual(self.client.post('/api/hotspots/', {'title': 'test', 'location': 99999}).status_code, 400)
        self.assertEqual(self.client.post('/api/route-steps/', {'route': self.route.pk, 'step_no': 20, 'location': Location.objects.first().pk, 'hotspot': self.point.pk}).status_code, 400)

    def test_metric_dates_filter_and_errors(self):
        metric = Metric.objects.first()
        today = timezone.localdate().isoformat()
        url = f'/api/metrics/{metric.pk}/values/'
        self.assertEqual(self.client.get(url, {'from': today, 'to': today}).data['count'], 1)
        self.assertEqual(self.client.get(url, {'from': 'bad'}).status_code, 400)
        self.assertEqual(self.client.get(url, {'from': '2026-11-09', 'to': '2026-11-08'}).status_code, 400)
        self.assertEqual(self.client.get('/api/locations/?enterprise=bad').status_code, 400)

    def test_metric_value_unique_and_utilization_validation(self):
        self.client.force_authenticate(self.editor)
        value = MetricValue.objects.first()
        response = self.client.post('/api/metric-values/', {'metric': value.metric_id, 'measured_on': str(value.measured_on), 'value': 4})
        self.assertEqual(response.status_code, 400)
        metric = Metric.objects.filter(code='utilization').first()
        response = self.client.post('/api/metric-values/', {'metric': metric.pk, 'measured_on': '2030-01-01', 'value': 101})
        self.assertEqual(response.status_code, 400)

    def test_dashboard_permissions_and_metrics(self):
        url = f'/api/dashboard/?process={self.process.pk}'
        for user, expected in [(self.visitor, 403), (self.editor, 403), (self.manager, 200), (self.administrator, 200)]:
            self.client.force_authenticate(user)
            response = self.client.get(url)
            self.assertEqual(response.status_code, expected, response.data)
        self.assertEqual(len(response.data['metrics']), 4)
        self.assertEqual(response.data['bottleneck']['name'], 'Контроль качества')
        self.assertEqual(self.client.get('/api/dashboard/').status_code, 400)
        self.assertEqual(self.client.get(url + '&from=2000-01-01').status_code, 400)

    def test_events_and_completion_are_anonymous_and_deduplicated(self):
        session = str(uuid.uuid4())
        base = {'session_id': session, 'route': self.route.pk}
        for event in [{'event_type': 'open'}, {'event_type': 'open', 'hotspot': self.point.pk}, {'event_type': 'finish'}, {'event_type': 'finish'}]:
            response = self.client.post('/api/events/', {**base, **event}, format='json')
            self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client.get('/api/events/').status_code, 405)
        self.assertNotIn('user', {f.name for f in TourEvent._meta.fields})
        self.client.force_authenticate(self.manager)
        data = self.client.get(f'/api/dashboard/?process={self.process.pk}').data
        result = next(r for r in data['analytics']['routes'] if r['route'] == self.route.pk)
        self.assertEqual(result['finished_sessions'], 1)
        self.assertEqual(result['completion_rate'], 100)

    def test_events_reject_bad_session_unrelated_and_hidden_points(self):
        payload = {'session_id': str(uuid.uuid4()), 'route': self.route.pk, 'event_type': 'open'}
        self.assertEqual(self.client.post('/api/events/', {**payload, 'session_id': 'user@example.com'}).status_code, 400)
        unrelated = Hotspot.objects.get(title='Сливная эстакада')
        self.assertEqual(self.client.post('/api/events/', {**payload, 'hotspot': unrelated.pk}).status_code, 400)
        self.point.status = 'hidden'
        self.point.save()
        self.assertEqual(self.client.post('/api/events/', {**payload, 'hotspot': self.point.pk}).status_code, 400)

    def test_upload_image_and_reject_executable(self):
        self.client.force_authenticate(self.editor)
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            image = io.BytesIO()
            Image.new('RGB', (2, 2), color='red').save(image, format='PNG')
            upload = SimpleUploadedFile('test.png', image.getvalue(), content_type='image/png')
            response = self.client.post('/api/media/', {'hotspot': self.point.pk, 'media_type': 'image', 'file': upload}, format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            self.assertIn('/media/assets/', response.data['url'])
            bad = SimpleUploadedFile('attack.png', b'<script>alert(1)</script>', content_type='image/png')
            self.assertEqual(self.client.post('/api/media/', {'hotspot': self.point.pk, 'media_type': 'image', 'file': bad}, format='multipart').status_code, 400)
            bad = SimpleUploadedFile('attack.html', b'<script>alert(1)</script>')
            self.assertEqual(self.client.post('/api/media/', {'hotspot': self.point.pk, 'media_type': 'image', 'file': bad}, format='multipart').status_code, 400)

    def test_editor_admin_cannot_manage_users(self):
        self.assertTrue(self.editor.has_perm('tour.change_hotspot'))
        self.assertFalse(self.editor.has_perm('accounts.change_user'))
        self.assertFalse(self.editor.has_module_perms('accounts'))
        self.assertTrue(self.administrator.has_perm('accounts.change_user'))
        self.assertFalse(self.visitor.is_staff)

    def test_seed_is_idempotent(self):
        before = MetricValue.objects.count()
        call_command('seed_demo', stdout=io.StringIO())
        self.assertEqual(MetricValue.objects.count(), before)
        self.assertEqual(Hotspot.objects.count(), 10)

class ImportTests(TestCase):
    def test_json_transaction_rollback_and_dry_run(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'content.json'
            data = [{'model': 'tour.enterprise', 'pk': 1, 'fields': {'name': 'Import', 'description': ''}}]
            path.write_text(json.dumps(data))
            call_command('import_content', str(path), dry_run=True, stdout=io.StringIO())
            self.assertFalse(Enterprise.objects.exists())
            data.append({'model': 'tour.location', 'pk': 1, 'fields': {'enterprise': 999, 'name': 'Invalid', 'scene_type': 'model'}})
            path.write_text(json.dumps(data))
            with self.assertRaises(CommandError):
                call_command('import_content', str(path), stdout=io.StringIO())
            self.assertFalse(Enterprise.objects.exists())

    def test_json_rejects_user_models(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'users.json'
            path.write_text('[{"model":"accounts.user","pk":1,"fields":{}}]')
            with self.assertRaises(CommandError):
                call_command('import_content', str(path))

    def test_csv_import_and_duplicate_rollback(self):
        call_command('seed_demo', stdout=io.StringIO())
        metric = Metric.objects.first()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'values.csv'
            path.write_text(f'metric_id,measured_on,value\n{metric.pk},2030-01-01,3.5\n')
            call_command('import_content', str(path), stdout=io.StringIO())
            self.assertTrue(MetricValue.objects.filter(metric=metric, measured_on='2030-01-01').exists())
            path.write_text(f'metric_id,measured_on,value\n{metric.pk},2030-01-02,3.5\n{metric.pk},2030-01-01,3.5\n')
            with self.assertRaises(CommandError):
                call_command('import_content', str(path), stdout=io.StringIO())
            self.assertFalse(MetricValue.objects.filter(metric=metric, measured_on='2030-01-02').exists())

    def test_demo_fixture_import_roundtrip(self):
        from django.conf import settings
        path = settings.BASE_DIR / 'seed' / 'demo.json'
        call_command('import_content', str(path), stdout=io.StringIO())
        self.assertEqual(Hotspot.objects.count(), 10)
        self.assertEqual(Route.objects.count(), 3)
        self.assertEqual(MetricValue.objects.count(), 1170)
        for point in Hotspot.objects.all():
            point.full_clean()
