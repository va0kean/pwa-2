# PWA-2: Архив статей - НЕ РАБОТАЕТ

PWA-сайт для чтения архива статей из `txt`-файлов с таблицей, сортировкой, поиском и статусами.

## Что реализовано

- Таблица из 4 колонок: `Категория`, `Автор`, `Название`, `Статус`.
- Поиск по `Категория`, `Автор`, `Название`.
- Сортировка по всем колонкам.
- Открытие полного текста статьи в модальном окне.
- Поддержка нескольких категорий в одном файле (разные строки таблицы).
- Статус статьи: `Без статуса` / `Приоритетный` / `Выполненный`.
- PWA: `manifest` + `service worker`.

## Важное ограничение

`public/data/articles.json` после сборки может быть очень большим (у вас ~156 МБ). Такой файл обычно не подходит для хранения в git-репозитории и может быть неудобен для загрузки в браузере.

## Рекомендуемая схема публикации

1. Сайт деплоится в GitHub Pages из ветки `main` через GitHub Actions (`.github/workflows/deploy-pages.yml`).
2. База статей хранится отдельно в облаке (GCS/S3/R2) и отдается по URL.
3. В `public/config.json` указывается:

```json
{
  "datasetUrl": "https://<your-storage>/articles.json"
}
```

Если `datasetUrl` пустой, приложение пытается читать локально: `data/articles.json`.

## Локальный запуск

```bash
npm install
npm run build:data
npm run dev
```

## Production-сборка

```bash
npm run build:data
npm run build
```

## Настройка GitHub Pages

1. `Settings -> Pages -> Build and deployment -> Source: GitHub Actions`.
2. Ветка для работы: `main`.
3. После push в `main` workflow сам публикует `dist`.

## Команды

- `npm run build:data` — конвертация `txt/*.txt` (cp1251) в JSON.
- `npm run dev` — локальный запуск.
- `npm run build` — сборка.
- `npm run preview` — просмотр сборки.

## Лицензия

MIT (`LICENSE`).
