#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getCustomerSchema, handleGetCustomer } from "./tools/customer.js";
import { createOrderSchema, handleCreateOrder } from "./tools/order.js";
import { getSegmentsSchema, handleGetSegments } from "./tools/segments.js";

const server = new McpServer({ name: "mindbox-mcp", version: "1.0.0" });

server.tool("get_customer", "Получение профиля клиента из Mindbox по email, телефону или ID.", getCustomerSchema.shape,
  async (params) => ({ content: [{ type: "text", text: await handleGetCustomer(params) }] }));

server.tool("create_order", "Создание заказа в Mindbox с привязкой к клиенту.", createOrderSchema.shape,
  async (params) => ({ content: [{ type: "text", text: await handleCreateOrder(params) }] }));

server.tool("get_segments", "Получение сегментов клиента в Mindbox.", getSegmentsSchema.shape,
  async (params) => ({ content: [{ type: "text", text: await handleGetSegments(params) }] }));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mindbox-mcp] Сервер запущен. 3 инструмента.");
}

main().catch((error) => { console.error("[mindbox-mcp] Ошибка:", error); process.exit(1); });
