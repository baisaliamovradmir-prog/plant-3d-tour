# 3D-тур: часть роли «3D» (ветка `3d`)

## Запуск

Всё запускается в Docker на данных-заглушках, бэкенд не нужен.

Разработка с горячей перезагрузкой — http://localhost:5173:

```bash
docker compose -f docker-compose.3d.yml up tour-dev
```

Продакшен-сборка в nginx — http://localhost:8080:

```bash
docker compose -f docker-compose.3d.yml --profile prod up --build tour
```

Адреса:
- `/` — выбор маршрута;
- `/tour/1`, `/tour/2`, `/tour/3` — маршруты для абитуриентов, партнёров и новых сотрудников;
- `/tour` — свободный осмотр;
- `/tour?edit=1` — редактор точек.

## Что здесь моё, а что временное

| Путь | Чьё | Что это |
|---|---|---|
Весь код 3D лежит в одной папке `frontend/src/3d/`. Снаружи от неё 3D ничего не трогает, кроме общего каркаса Vite (см. «Слияние с фронтендом»).

| Путь | Чьё | Что это |
|---|---|---|
| `frontend/src/3d/index.js` | 3D | **единственный публичный вход**: `TourCanvas`, `useTourStore`, `api`. Стили тура подключаются вместе с ним |
| `frontend/src/3d/scene/` | 3D | сцена: генплан, цеха, панорама, метки, камера, мини-карта, редактор точек, текстовая версия |
| `frontend/src/3d/store/tourStore.js` | 3D | состояние тура (Zustand) |
| `frontend/src/3d/api/client.js`, `frontend/src/3d/api/mock/` | 3D, для бэкенда | клиент API в режимах mock и live, синтетические данные по схеме БД |
| `frontend/src/3d/_stubs/` | **временно** | оболочка, выбор маршрута, карточка точки, экраны процесса и кейса. Фронтенд заменит их своими |
| `frontend/public/3d/demo-media/` | 3D | демо-картинки для карточек точек |
| `docs/3d/` | 3D, для ТЗ | архитектура сцены, карта точек интереса, мнемосхема |
| `docker-compose.3d.yml`, `frontend/Dockerfile.3d`, `frontend/nginx.3d.conf` | 3D | автономный запуск тура (имена с `.3d`, чтобы не пересечься с общими `Dockerfile` и nginx) |

## Слияние с фронтендом

Эти файлы — общий каркас Vite. Если фронтенд заведёт свои, при слиянии **берите его версию** и добавьте в неё нужное туру:

| Файл | Что нужно туру |
|---|---|
| `frontend/package.json` | зависимости `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, `recharts` (последний нужен только заглушкам), версии как здесь |
| `frontend/vite.config.js` | ничего обязательного; `manualChunks` для `three` и `r3f` ускоряет загрузку |
| `frontend/src/main.jsx`, `frontend/index.html` | ничего: здесь они только запускают `_stubs` |
| `frontend/.gitignore` | `node_modules/`, `dist/` |

После слияния:

```jsx
import { TourCanvas, useTourStore } from './3d'
```

Папку `src/3d/_stubs/` можно удалить, как только у фронтенда появятся свои страницы.

## Для команды

- **Фронтенд (Тимур).** Холст подключается одной строкой: `<TourCanvas />` (импорт из `src/3d`). Карточка точки берёт id из `useTourStore(s => s.selectedHotspotId)`. Маршрут управляется через `startRoute`, `next` и `prev`.
- **Бэкенд (Андрей).** Поля в `src/3d/api/mock/*.json` совпадают с DBML из документа «Структура проекта», их можно брать как основу для `seed/demo.json`. Нужен дополнительный запрос `GET /api/locations/`. Сам контракт расписан в `scene-architecture.md`, раздел «Связь с бэкендом». Чтобы переключиться на живое API, задайте `VITE_API_MODE=live`.
- **Аналитик (Алина).** В ТЗ идут `mnemo.svg` (мнемосхема, п. 2), `poi-map.md` (карта точек интереса) и `scene-architecture.md` (архитектура сцены).
