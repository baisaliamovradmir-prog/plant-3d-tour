# Plant 3D Tour — backend

Готовая серверная часть для направления B из «3D-тур по предприятию: структура проекта».
Python 3.12, Django 5.2, DRF, JWT, PostgreSQL (Docker) / SQLite (локально).
Весь код находится в `backend/`. Перенесите эту папку в корень `plant-3d-tour`.
Архив не содержит фронтенда, 3D-моделей, коммитов, `.git`, паролей или рабочей БД.

## Быстрый запуск без Docker

Из папки `backend`:

```bash
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py createsuperuser
python manage.py runserver
```

Откройте:
- http://127.0.0.1:8000/admin/ — админка, вход созданным superuser.
- http://127.0.0.1:8000/api/docs/ — Swagger; сначала выполните login, затем Authorize с access-токеном.
- http://127.0.0.1:8000/api/schema/ — OpenAPI.
- http://127.0.0.1:8000/api/health/ — проверка приложения и БД.

Локальный режим по умолчанию использует SQLite и DEBUG=true; это режим разработки.
`manage.py` не читает `.env` автоматически: при локальном запуске переменные задаются в оболочке.
Войти в REST API можно тем же логином и паролем, что в админку.
Регистрация создаёт только посетителя. Роли назначает администратор в `/admin/accounts/user/`.

Для четырёх демо-пользователей установите `DEMO_PASSWORD` в оболочке и выполните:

```bash
python manage.py seed_demo --with-users
```

Логины: `demo_visitor`, `demo_manager`, `demo_editor`, `demo_admin`.
Пароль — ваше значение `DEMO_PASSWORD`; в коде и fixture его нет.
Повторный seed не меняет данные и пароли существующих пользователей.
Для задания даты истории: `python manage.py seed_demo --end-date 2026-11-09` (на пустой БД).

## Запуск через Docker

Из папки `backend`:

```bash
cp .env.example .env
# PowerShell: Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Вставьте сгенерированную строку в `DJANGO_SECRET_KEY` файла `.env`.
Сгенерируйте отдельно `POSTGRES_PASSWORD`. При желании заполните `DEMO_PASSWORD`.

```bash
docker compose up --build -d
docker compose exec backend python manage.py createsuperuser
```

API и админка доступны на http://localhost:8000. БД наружу не публикуется.
Compose автоматически применяет миграции, собирает статику и (при SEED_DEMO=true)
добавляет демо-контент. Данные PostgreSQL, медиа и статика находятся в volumes.
`docker compose down` сохраняет данные. `down -v` удаляет volumes — не используйте для обычной остановки.

Docker-конфигурация обслуживает только бэкенд и его медиа/статику, фронтенд запускается отдельно.
Если в командном репозитории появится общий compose, переносите сервисы в него осознанно:
корневые файлы проекта этот комплект не заменяет.

## Что реализовано

- Регистрация с обязательным согласием и версией политики, вход, refresh rotation,
  logout с blacklist refresh-токена, профиль и удаление своего аккаунта.
- Роли visitor / manager / editor / admin; сервер проверяет роль в каждом запросе.
- CRUD предприятий, локаций, точек, медиа, маршрутов, шагов, процессов,
  ресурсов, этапов, метрик, значений и кейсов.
- Связка точка → этап → процесс → метрика; кейсы и обратные ссылки из кейса/этапа в тур.
- История метрик с датами, пагинацией и валидацией диапазона.
- Дашборд: четыре метрики, история, кейсы, предполагаемое узкое место,
  популярные точки, завершения маршрутов и последние точки незавершённых сессий.
- Django Admin для наполнения, REST для редактора точек, загрузка файлов multipart.
- OpenAPI/Swagger, миграции, воспроизводимый генератор и готовая JSON fixture.
- Атомарный импорт JSON контента и CSV значений метрик с dry-run.

Подробный контракт фронтенду: [docs/API.md](docs/API.md).
Схема БД: [docs/schema.dbml](docs/schema.dbml).
Проверки и соответствие ТЗ: [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md).
Развёртывание и границы прототипа: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Демо-данные

Один синтетический завод смазочных материалов, 6 локаций, 7 этапов,
7 ресурсов, 10 точек, 3 маршрута для разных аудиторий, 3 кейса,
13 метрик × 90 дней = 1170 значений.

В ОТК заложена самая высокая длительность. Значения кейсов — отдельные
синтетические примеры «до/после», они не получены симуляцией.
Файлы сцен отсутствуют: `asset_url` / `preview_url` возвращают null, пока редактор
не загрузит реальные файлы. Геометрия сцены и UI относятся к другой части команды.
Медиа API работает; фотографии, видео и модели добавляются через админку/API.

Свежая история: `python manage.py seed_demo`.
Фиксированная история из архива (не выполнять вместе с seed на той же БД):

```bash
python manage.py import_content seed/demo.json --dry-run
python manage.py import_content seed/demo.json
```

Стандартный `loaddata seed/demo.json` тоже поддерживается, но обходит `full_clean`.
Предпочтителен валидирующий `import_content`. Fixture не содержит пользователей.
Импорт добавляет записи, не перезаписывает занятые ID; при ошибке откатывается целиком.
Импорт автоматически упорядочивает модели по зависимостям; JSON использует формат `seed/demo.json`.
Для нового предприятия экспортируйте согласованный набор с незанятыми ID.
У файла media должны быть предварительно размещены соответствующие файлы в MEDIA_ROOT.

CSV поддерживается для истории метрик:

```csv
metric_id,measured_on,value
1,2027-01-01,1.25
1,2027-01-02,1.30
```

```bash
python manage.py import_content values.csv --dry-run
python manage.py import_content values.csv
```

Для экспорта собственного набора без пользователей и событий:

```bash
python manage.py export_content customer-export.json
```

Команда не перезаписывает существующий файл. Медиа копируются отдельно.

## Проверки

```bash
python manage.py test tests
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py spectacular --file docs/openapi.yaml --validate --fail-on-warn
```

Зависимости зафиксированы в `requirements.txt`. Перед публичным развёртыванием
проверьте обновления безопасности, настройте HTTPS и резервные копии.
