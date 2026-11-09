# Проверки и соответствие ТЗ

Основание: подробный документ «3D-тур по предприятию: структура проекта», направление B.
Репозиторий осмотрен только на чтение: default branch main содержит README.md и .gitignore.
Все новые файлы помещены в отдельную папку backend; изменения в GitHub не выполнялись.

| Требование | Реализация сервера | Проверка |
|---|---|---|
| ФТ-1 | JWT, роли и ограничения Django Admin | auth, token rotation, role matrix |
| ФТ-2 | consent=true, дата и версия согласия | отказ без согласия, защита назначения роли |
| ФТ-3 | audience + 3 демо-маршрута | получение маршрутов |
| ФТ-4–5 | локации, тип сцены, файл, координаты карты | API локации; визуализация — frontend/3D |
| ФТ-6 | точки, медиа, вложенные этап и кейс | сквозной API, загрузка изображения |
| ФТ-7 | процесс, 7 этапов, история метрик | tour → hotspot → process → metric |
| ФТ-8 | steps по порядку, narration, step_count | 8 шагов маршрута партнёра |
| ФТ-9 | кейсы, before/after, improvement_percent | кейс ОТК: улучшение 50% |
| ФТ-10 | 4 метрики, история, bottleneck, ссылки в тур | manager/admin 200, visitor/editor 403 |
| ФТ-11–12 | Django Admin, CRUD, PATCH координат, multipart | права записи, неверные связи/координаты |
| ФТ-13 | JSON контент, CSV метрики, dry-run, atomic rollback | roundtrip fixture, откат CSV/JSON |
| ФТ-14 | обезличенные события и агрегаты | UUID, маршрут, повтор finish |
| НФТ-5 | хэши паролей, JWT, CSRF админки, роли | тесты доступа; HTTPS на стороне развёртывания |
| НФТ-6 | минимальные поля, согласие, удаление аккаунта | DELETE me отзывает доступ; оргмеры отдельно |
| НФТ-7 | данные и медиа отделены от кода | fixture и генератор |
| НФТ-9 | backend + PostgreSQL + Nginx в Compose | конфигурация включена; Docker здесь не запускался |

## Выполненные проверки

- `python manage.py test tests`: 25 тестов, SQLite.
- `python manage.py check`: без замечаний.
- `python manage.py makemigrations --check --dry-run`: изменений моделей без миграций нет.
- `python manage.py spectacular --file docs/openapi.yaml --validate --fail-on-warn`: схема валидна.
- Чистая установка БД, загрузка демо-данных и повторный seed.
- После распаковки ZIP: чистые миграции и seed, реальный HTTP health/login/routes/dashboard успешно проверены.
- Импорт архивной fixture в пустую тестовую БД: 10 точек, 3 маршрута, 1170 значений.

Docker CLI и сервер PostgreSQL отсутствуют в среде сборки. Поэтому сборка Docker-образа,
Compose и интеграционные тесты на PostgreSQL должны быть выполнены у команды.
Нагрузочные проверки, браузерная/мобильная производительность и реальный 3D не проверялись:
они требуют клиентской части и медиа.

## Ручной smoke test команды

1. migrate → seed_demo → createsuperuser → runserver.
2. Войти в Swagger через auth/login/, установить access в Authorize.
3. Пройти route → location → hotspot «Отбор проб» → process → metric values.
4. Получить dashboard?process=1: четыре метрики, bottleneck «Контроль качества».
5. В админке создать editor; проверить создание точки и перемещение координат через PATCH.
6. Создать visitor через register: GET доступен, PATCH точки и dashboard запрещены.
7. Загрузить PNG через media/, затем GLB в location.asset; получить URL с клиента.
8. Выполнить `docker compose up --build -d`; проверить health и админку.

Не используйте фиксированные ID после загрузки другого набора данных: выбирайте их из API.
