# @theyahia/mindbox-mcp

MCP-сервер для API Mindbox CDP — профили клиентов, заказы, сегменты, списки товаров и произвольные операции.

[![npm](https://img.shields.io/npm/v/@theyahia/mindbox-mcp)](https://www.npmjs.com/package/@theyahia/mindbox-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Возможности

- 6 инструментов для работы с Mindbox API
- Транспорт: stdio (по умолчанию) и Streamable HTTP (`--http`)
- Совместимость с Claude Desktop, Claude Code, Cursor, Smithery
- Skills для автоматизации типовых сценариев

## Установка

### Claude Desktop

```json
{
  "mcpServers": {
    "mindbox": {
      "command": "npx",
      "args": ["-y", "@theyahia/mindbox-mcp"],
      "env": {
        "MINDBOX_API_KEY": "ваш_ключ",
        "MINDBOX_ENDPOINT_ID": "ваш_endpoint_id"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add mindbox -e MINDBOX_API_KEY=ваш_ключ -e MINDBOX_ENDPOINT_ID=ваш_endpoint_id -- npx -y @theyahia/mindbox-mcp
```

### Streamable HTTP

```bash
MINDBOX_API_KEY=ваш_ключ MINDBOX_ENDPOINT_ID=ваш_endpoint_id npx @theyahia/mindbox-mcp --http
# MCP endpoint: http://localhost:3000/mcp
# Health check: http://localhost:3000/health
```

Порт настраивается через `PORT` (по умолчанию 3000).

### Smithery

Файл `smithery.yaml` включён. Требуемые параметры: `MINDBOX_API_KEY`, `MINDBOX_ENDPOINT_ID`.

## Авторизация

| Переменная | Описание |
|------------|----------|
| `MINDBOX_API_KEY` | Секретный ключ API Mindbox (также принимает `MINDBOX_SECRET_KEY`) |
| `MINDBOX_ENDPOINT_ID` | ID эндпоинта в Mindbox |

Заголовок авторизации: `Authorization: Mindbox secretKey="..."`.

## Инструменты (6)

| Инструмент | Описание |
|------------|----------|
| `get_customer` | Получение профиля клиента по email/телефону/ID |
| `create_order` | Создание заказа с привязкой к клиенту |
| `get_segments` | Получение сегментов клиента |
| `get_product_list` | Получение списка товаров |
| `update_customer` | Обновление профиля клиента |
| `run_operation` | Выполнение произвольной операции Mindbox API |

## Skills

| Скилл | Описание | Триггер |
|-------|----------|---------|
| `skill-customer-search` | Поиск клиента в Mindbox | "Найди клиента в Mindbox" |
| `skill-segment-stats` | Статистика сегментов | "Статистика сегментов" |

## Примеры запросов

```
Найди клиента с email user@example.com
Создай заказ для клиента с телефоном +7900...
Какие сегменты у клиента user@example.com?
Покажи список товаров
Обнови имя клиента с ID 12345
Выполни операцию Custom.GetData с телом {"key": "value"}
```

## Разработка

```bash
npm install
npm run dev          # stdio
npm run dev:http     # HTTP на порту 3000
npm test             # Vitest
```

## Лицензия

MIT
