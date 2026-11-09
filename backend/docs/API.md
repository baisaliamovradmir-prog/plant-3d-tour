# Контракт API для фронтенда

База: `http://localhost:8000/api/`. Все адреса оканчиваются `/`.
JSON, UTF-8. Для файлов — `multipart/form-data`. CORS разрешён для Vite localhost:5173.
Авторизация: `Authorization: Bearer <access>`. Сессионный вход Django Admin не заменяет JWT.
Полная машиночитаемая схема: `openapi.yaml`; актуальная схема: `/api/schema/`.

## Авторизация

| Метод и путь | Тело / результат |
|---|---|
| POST auth/register/ | `{username,email,password,consent:true}` → 201; роль всегда visitor |
| POST auth/login/ | `{username,password}` → `{access,refresh}` |
| POST auth/refresh/ | `{refresh}` → новые access и refresh; старый refresh становится недействительным |
| POST auth/logout/ | `{refresh}` + access в заголовке → 204 |
| GET auth/me/ | `{id,username,email,role,consent_at,policy_version}` |
| DELETE auth/me/ | Удаляет свой аккаунт → 204; сервер отвергает его токены |

Access действует 30 минут, refresh — сутки. При logout клиент удаляет оба токена;
ранее выданный access остаётся действующим до истечения срока (обычная модель JWT).
Удаление аккаунта и изменение пароля инвалидируют access на сервере.
Не храните токены в URL. Для приложения предпочтительно хранить access в памяти;
способ сохранения refresh выбирайте с учётом защиты от XSS. Cookie auth здесь не реализована.

Пример входа:

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"your_login","password":"your_password"}'
curl http://127.0.0.1:8000/api/routes/ -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## Роли

| Возможность | visitor | manager | editor | admin |
|---|---|---|---|---|
| Читать тур и процессы | да | да | да | да |
| Видеть скрытые точки/неопубликованные маршруты | нет | нет | да | да |
| Менять контент и медиа | нет | нет | да | да |
| Дашборд | нет | да | нет | да |
| Django Admin: контент | нет | нет | да | да |
| Django Admin: пользователи и роли | нет | нет | нет | да |

Роли глобальные для всего экземпляра приложения, не являются разделением арендаторов.
Фильтр enterprise помогает выбрать завод; он не является механизмом разграничения доступа.

## Контент

Все перечисленные коллекции имеют GET списка, POST создания,
GET/PATCH/PUT/DELETE по `{id}/`. Запись разрешена editor/admin.

| Коллекция | Фильтры query | Особенности |
|---|---|---|
| enterprises/ | — | Предприятия |
| locations/ | enterprise | Детали, ссылки на файлы, вложенные видимые hotspots |
| hotspots/ | location, status | media, stage_detail, case_detail; visitor видит только published |
| routes/ | enterprise, audience | Упорядоченные steps, step_count |
| route-steps/ | route | route, step_no, location, hotspot, narration |
| media/ | hotspot | Загрузка file; в ответе url |
| processes/ | enterprise | stages с метриками + общие metrics |
| stages/ | process, location | metrics, hotspot_ids |
| resources/ | location | capacity и capacity_unit |
| metrics/ | process, stage, code | latest; stage=null означает метрику всего процесса |
| metric-values/ | metric | metric, measured_on, value |
| cases/ | enterprise, metric | metric_detail, improvement_percent, tour_links |

Все списки и история метрик пагинируются:
`{count, next, previous, results:[...]}`, 50 записей на страницу, `?page=2`.
Вложенные массивы steps/stages/hotspots не пагинируются.

`GET metrics/{id}/values/?from=2026-10-01&to=2026-10-31`:
даты включительно, формат YYYY-MM-DD, порядок по возрастанию даты.
Одна запись на метрику в день. Загрузка ресурсов хранится в процентах 0..100,
время — в часах, стоимость — в рублях, единица выпуска указана в `unit`.
`cost_rub` — Decimal и сериализуется строкой; остальные числовые метрики — числа.

## Сквозной сценарий

1. Войти; получить роль через auth/me/.
2. GET routes/?audience=partners; выбрать маршрут по ID.
3. GET routes/{id}/ → `steps`. Текущий прогресс = индекс массива + 1 из step_count.
4. GET locations/{step.location}/ → scene_type, asset_url, preview_url, hotspots.
5. GET hotspots/{step.hotspot}/ → описание, media, stage_detail, case_detail.
6. `stage_detail.process` → GET processes/{id}/; подсветить `stage_detail.id`.
7. `stage_detail.metrics[i].id` → GET metrics/{id}/values/ для графика.
8. GET cases/{hotspot.case}/ → проблема/решение/до/после; tour_links ведут обратно в тур.

Для обзорных точек без stage используйте enterprise локации → processes/?enterprise=ID.
Возврат в тур — состояние фронтенда (route ID, индекс шага, location ID, hotspot ID).
Кнопки «Далее/Назад» работают по массиву steps. При скрытии точки шаг исключается
из посетительского ответа; исходные step_no могут иметь пропуски.
Данные считаются текстом: не вставляйте description/narration как непроверенный HTML.

## Координаты и редактор

3D: pos_x/pos_y/pos_z — координаты сцены в единицах модели.
Панорама: yaw в [-180,180], pitch в [-90,90], **градусы**, не радианы.
Мини-карта: map_x/map_y — условные координаты; масштаб задаёт фронтенд.
Типы scene_type: overview / panorama / model; asset_url может быть null.
Статусы точки: draft / published / hidden / archived. Редактор задаёт статус через PATCH.

```json
{"location":4,"title":"Новая точка","kind":"info","status":"draft","pos_x":1.2,"pos_y":1,"pos_z":-3}
```

ID локации берите из API, пример 4 не является универсальным.
Для kind=process обязателен stage, для case — case, для transition — target_location.
Этап должен находиться в той же локации, связи — в одном предприятии.
Перемещение родительских объектов между предприятиями запрещено, чтобы не ломать связи.
Для изменения порядка шагов используйте свободные временные step_no, затем итоговые.

## Медиа

POST media/: hotspot, media_type (image/video/pdf), file, caption.
PATCH locations/{id}/: asset (GLB или панорама), preview (изображение).
JPG/PNG/WebP/GLB ≤ 5 МиБ; PDF/MP4 ≤ 10 МиБ, проверяются расширение и сигнатура.
Для мобильных панорам рекомендуется ≤ 2 МиБ. SVG/HTML не принимаются.
Файлы получают случайные имена. Путь file не принимается как строковый URL при API-загрузке.
Медиа имеют публичные URL; скрытие точки не отзывает уже известную ссылку на файл.

## Дашборд

GET dashboard/?process=ID&from=YYYY-MM-DD&to=YYYY-MM-DD, только manager/admin.
По умолчанию последние 90 дней; максимум 367 календарных дней.
Ответ: process, period, metrics (4 общих), bottleneck, cases, analytics.

`bottleneck` — этап с максимальной последней stage_duration в выбранном периоде,
с measured_on, location и hotspot_ids. При отсутствии наблюдений — null.
Это описательная эвристика направления B, не производственная симуляция
и не доказательство причины задержки. В демо указывает на лабораторию ОТК.
Даты последних значений разных этапов могут отличаться.

## События и аналитика

POST events/ требует JWT, но запись не содержит user/email/IP/token.
session_id — случайный UUID, создаваемый клиентом на один проход маршрута.
Не используйте постоянный идентификатор пользователя.

```json
{"session_id":"306c8b19-c8b8-4afd-a77b-d29b6348c83c","route":2,"event_type":"open"}
```

- Начало: open без hotspot.
- Открытие точки: open с hotspot.
- Завершение: finish без hotspot.
- Для каждого нового прохождения генерировать новый UUID.

Популярность считает события open точек; повторные открытия учитываются.
Завершения считаются по уникальным UUID, повтор finish не увеличивает процент.
В периоде учитываются только сессии, у которых есть начало в этом же периоде.
`unfinished_sessions` — начатые без finish, включая ещё активные.
`dropoff_hotspots` — последние открытые точки таких сессий, не окончательный факт ухода.
Журнал событий доступен только администратору в Django Admin.

## Ошибки

400 — невалидные поля/даты/связи; 401 — нет или истёк JWT;
403 — нет прав; 404 — нет объекта или он скрыт; 409 — объект защищён зависимостями;
429 — превышен лимит запросов. Для 400 ответ содержит имена полей и списки ошибок.
Не повторяйте POST при сетевой ошибке без проверки результата: универсального idempotency-key нет.
