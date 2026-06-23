# Contributing

Спасибо за интерес к проекту! Ниже — как запустить, проверить и предложить изменения.

## Требования

- Node.js >= 18
- npm

## Установка и разработка

```bash
npm install            # установит зависимости и соберёт dist (prepare)
npm run dev            # запуск в режиме stdio (tsx, без сборки)
npm run dev:http       # запуск HTTP-режима на порту 3000
```

Положите ключи в `.env.local` (см. `.env.example`) или передайте через окружение.

## Проверки перед PR

```bash
npm run build          # tsc -> dist/
npm run typecheck      # tsc --noEmit (включая тесты)
npm run lint           # ESLint
npm run format:check   # Prettier (форматирование: npm run format)
npm test               # Vitest
```

Все шаги обязаны проходить — те же проверки гоняет CI на Node 18/20/22.

## Архитектура (коротко)

- `src/client.ts` — HTTP-клиент Mindbox: путь `/v3/operations/{sync|async}`, повторы, идемпотентность,
  ленивый `getClient()`.
- `src/tools/*.ts` — по одному файлу на инструмент (zod-схема + хендлер).
- `src/identify.ts` — единый guard идентификатора клиента.
- `src/response.ts` — защитный разбор ответа Mindbox (`status`, `validationMessages`).
- `src/index.ts` — регистрация инструментов, транспорты stdio и stateless Streamable HTTP.

## Добавление инструмента

1. Создайте `src/tools/<name>.ts` с экспортами `<name>Schema` (zod) и `handle<Name>(params)`.
2. Внутри хендлера вызывайте `getClient().operation(...)` (не создавайте клиент на верхнем уровне).
3. Зарегистрируйте инструмент в массиве `TOOLS` в `src/index.ts`.
4. Добавьте тест в `src/__tests__/`.

## Стиль

- TypeScript strict, ESM (`.js`-расширения в импортах для Node16-резолвинга).
- Prettier + ESLint — запускайте `npm run format` и `npm run lint:fix` перед коммитом.

## Релиз

См. блок «Release» в `package.json` scripts и обновляйте `CHANGELOG.md`, `package.json` и
`server.json` (версии — в lockstep).
