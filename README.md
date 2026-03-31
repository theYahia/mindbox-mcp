# @theyahia/mindbox-mcp

MCP-сервер для API Mindbox CDP — профили клиентов, создание заказов, сегментация.

[![npm](https://img.shields.io/npm/v/@theyahia/mindbox-mcp)](https://www.npmjs.com/package/@theyahia/mindbox-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Установка

### Claude Desktop

```json
{
  "mcpServers": {
    "mindbox": {
      "command": "npx",
      "args": ["-y", "@theyahia/mindbox-mcp"],
      "env": {
        "MINDBOX_SECRET_KEY": "ваш_ключ",
        "MINDBOX_ENDPOINT_ID": "ваш_endpoint_id"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add mindbox -e MINDBOX_SECRET_KEY=ваш_ключ -e MINDBOX_ENDPOINT_ID=ваш_endpoint_id -- npx -y @theyahia/mindbox-mcp
```

## Авторизация

`MINDBOX_SECRET_KEY` — секретный ключ API Mindbox.
`MINDBOX_ENDPOINT_ID` — ID эндпоинта в Mindbox.

## Инструменты (3)

| Инструмент | Описание |
|------------|----------|
| `get_customer` | Получение профиля клиента |
| `create_order` | Создание заказа |
| `get_segments` | Сегменты клиента |

## Примеры запросов

```
Найди клиента с email user@example.com
Создай заказ для клиента с телефоном +7900...
Какие сегменты у клиента user@example.com?
```

## Лицензия

MIT
