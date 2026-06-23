#!/usr/bin/env node

import { readFileSync } from "node:fs";
import type { ZodRawShape } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getCustomerSchema, handleGetCustomer } from "./tools/customer.js";
import { createOrderSchema, handleCreateOrder } from "./tools/order.js";
import { getSegmentsSchema, handleGetSegments } from "./tools/segments.js";
import { getProductListSchema, handleGetProductList } from "./tools/product-list.js";
import { updateCustomerSchema, handleUpdateCustomer } from "./tools/update-customer.js";
import { runOperationSchema, handleRunOperation } from "./tools/run-operation.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};
const VERSION = pkg.version;

interface ToolDef {
  name: string;
  description: string;
  shape: ZodRawShape;
  handler: (params: never) => Promise<string>;
}

const TOOLS: ToolDef[] = [
  {
    name: "get_customer",
    description: "Получение профиля клиента из Mindbox по email, телефону или ID.",
    shape: getCustomerSchema.shape,
    handler: handleGetCustomer,
  },
  {
    name: "create_order",
    description: "Создание заказа в Mindbox с привязкой к клиенту.",
    shape: createOrderSchema.shape,
    handler: handleCreateOrder,
  },
  {
    name: "get_segments",
    description: "Получение сегментов клиента в Mindbox.",
    shape: getSegmentsSchema.shape,
    handler: handleGetSegments,
  },
  {
    name: "get_product_list",
    description: "Получение списка товаров из Mindbox.",
    shape: getProductListSchema.shape,
    handler: handleGetProductList,
  },
  {
    name: "update_customer",
    description: "Обновление профиля клиента в Mindbox.",
    shape: updateCustomerSchema.shape,
    handler: handleUpdateCustomer,
  },
  {
    name: "run_operation",
    description:
      "⚠️ ОПАСНО: выполнение ПРОИЗВОЛЬНОЙ операции Mindbox API под секретным ключом. Может изменять данные. Отключается через MINDBOX_ALLOW_RAW=0.",
    shape: runOperationSchema.shape,
    handler: handleRunOperation,
  },
];

const TOOL_COUNT = TOOLS.length;

function createServer(): McpServer {
  const server = new McpServer({ name: "mindbox-mcp", version: VERSION });
  for (const tool of TOOLS) {
    server.tool(tool.name, tool.description, tool.shape, async (params) => ({
      content: [{ type: "text", text: await tool.handler(params as never) }],
    }));
  }
  return server;
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function startHttp(): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3000", 10);
  const host = process.env.HOST ?? "127.0.0.1";
  const httpToken = process.env.MINDBOX_HTTP_TOKEN?.trim();
  const { StreamableHTTPServerTransport } =
    await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const http = await import("node:http");

  const allowedHosts = [
    "127.0.0.1",
    "localhost",
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `${host}:${port}`,
    ...parseList(process.env.MINDBOX_HTTP_ALLOWED_HOSTS),
  ];
  const allowedOrigins = [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    ...parseList(process.env.MINDBOX_HTTP_ALLOWED_ORIGINS),
  ];

  const httpServer = http.createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ status: "ok", version: VERSION, tools: TOOL_COUNT }));
      return;
    }

    if (req.url !== "/mcp" && req.url !== "/") {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    // /mcp: только POST. GET (SSE) и DELETE (teardown) в stateless-режиме не нужны.
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json", Allow: "POST" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method Not Allowed. Используйте POST на /mcp." },
          id: null,
        }),
      );
      return;
    }

    // Опциональная bearer-авторизация HTTP-транспорта.
    if (httpToken) {
      const auth = req.headers["authorization"];
      if (auth !== `Bearer ${httpToken}`) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32001, message: "Unauthorized." },
            id: null,
          }),
        );
        return;
      }
    }

    // Stateless: свежий сервер + транспорт на каждый запрос (полная изоляция,
    // никаких коллизий request-ID между параллельными клиентами).
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts,
      allowedOrigins,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("[mindbox-mcp] Ошибка обработки HTTP-запроса:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error." },
            id: null,
          }),
        );
      }
    }
  });

  httpServer.listen(port, host, () => {
    console.error(`[mindbox-mcp] HTTP-сервер слушает ${host}:${port}`);
    console.error(`[mindbox-mcp] MCP endpoint: http://${host}:${port}/mcp`);
    console.error(`[mindbox-mcp] Health check: http://${host}:${port}/health`);
  });

  const shutdown = (signal: string) => {
    console.error(`[mindbox-mcp] Получен ${signal}, останавливаюсь…`);
    httpServer.close(() => process.exit(0));
    // Форсированный выход, если соединения висят.
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--http")) {
    await startHttp();
    return;
  }

  const transport = new StdioServerTransport();
  const server = createServer();
  await server.connect(transport);
  console.error(`[mindbox-mcp] Сервер запущен (stdio). Инструментов: ${TOOL_COUNT}.`);
}

export { createServer, TOOLS, VERSION };

main().catch((error) => {
  console.error("[mindbox-mcp] Ошибка:", error);
  process.exit(1);
});
