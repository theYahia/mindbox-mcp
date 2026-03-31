#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getCustomerSchema, handleGetCustomer } from "./tools/customer.js";
import { createOrderSchema, handleCreateOrder } from "./tools/order.js";
import { getSegmentsSchema, handleGetSegments } from "./tools/segments.js";
import { getProductListSchema, handleGetProductList } from "./tools/product-list.js";
import { updateCustomerSchema, handleUpdateCustomer } from "./tools/update-customer.js";
import { runOperationSchema, handleRunOperation } from "./tools/run-operation.js";

const VERSION = "1.1.0";

function createServer(): McpServer {
  const server = new McpServer({ name: "mindbox-mcp", version: VERSION });

  server.tool("get_customer", "Получение профиля клиента из Mindbox по email, телефону или ID.", getCustomerSchema.shape,
    async (params) => ({ content: [{ type: "text", text: await handleGetCustomer(params) }] }));

  server.tool("create_order", "Создание заказа в Mindbox с привязкой к клиенту.", createOrderSchema.shape,
    async (params) => ({ content: [{ type: "text", text: await handleCreateOrder(params) }] }));

  server.tool("get_segments", "Получение сегментов клиента в Mindbox.", getSegmentsSchema.shape,
    async (params) => ({ content: [{ type: "text", text: await handleGetSegments(params) }] }));

  server.tool("get_product_list", "Получение списка товаров из Mindbox.", getProductListSchema.shape,
    async (params) => ({ content: [{ type: "text", text: await handleGetProductList(params) }] }));

  server.tool("update_customer", "Обновление профиля клиента в Mindbox.", updateCustomerSchema.shape,
    async (params) => ({ content: [{ type: "text", text: await handleUpdateCustomer(params) }] }));

  server.tool("run_operation", "Выполнение произвольной операции Mindbox API.", runOperationSchema.shape,
    async (params) => ({ content: [{ type: "text", text: await handleRunOperation(params) }] }));

  return server;
}

async function main() {
  const args = process.argv.slice(2);
  const httpMode = args.includes("--http");

  const server = createServer();

  if (httpMode) {
    const port = parseInt(process.env.PORT ?? "3000", 10);
    const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
    const http = await import("node:http");

    const httpServer = http.createServer(async (req, res) => {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
          "Access-Control-Expose-Headers": "Mcp-Session-Id",
        });
        res.end();
        return;
      }

      const corsHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      };

      if (req.url === "/mcp" || req.url === "/") {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
        });
        // Set CORS headers
        for (const [k, v] of Object.entries(corsHeaders)) {
          res.setHeader(k, v);
        }
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } else if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
        res.end(JSON.stringify({ status: "ok", version: VERSION, tools: 6 }));
      } else {
        res.writeHead(404, corsHeaders);
        res.end("Not Found");
      }
    });

    httpServer.listen(port, () => {
      console.error(`[mindbox-mcp] HTTP server listening on port ${port}`);
      console.error(`[mindbox-mcp] MCP endpoint: http://localhost:${port}/mcp`);
      console.error(`[mindbox-mcp] Health check:  http://localhost:${port}/health`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[mindbox-mcp] Сервер запущен (stdio). ${6} инструментов.`);
  }
}

export { createServer };

main().catch((error) => { console.error("[mindbox-mcp] Ошибка:", error); process.exit(1); });
