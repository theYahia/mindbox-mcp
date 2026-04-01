import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env before importing modules
process.env.MINDBOX_API_KEY = "test-secret-key";
process.env.MINDBOX_ENDPOINT_ID = "test-endpoint";

function mockMindboxResponse(data: Record<string, unknown>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

function mockMindboxError(status: number, body: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => body,
  });
}

describe("MindboxClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should construct Authorization header correctly", async () => {
    const { MindboxClient } = await import("../client.js");
    const client = new MindboxClient();

    mockMindboxResponse({ status: "Success" });
    await client.operation("Test.Op", { foo: "bar" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("api.mindbox.ru/v3/operations");
    expect(url).toContain("endpointId=test-endpoint");
    expect(url).toContain("operation=Test.Op");
    expect(opts.headers["Authorization"]).toBe('Mindbox secretKey="test-secret-key"');
    expect(opts.headers["Content-Type"]).toContain("application/json");
  });

  it("should throw on HTTP error", async () => {
    const { MindboxClient } = await import("../client.js");
    const client = new MindboxClient();

    mockMindboxError(401, "Unauthorized");
    await expect(client.operation("Test.Op", {})).rejects.toThrow("Mindbox HTTP 401");
  });

  it("should throw on InternalServerError status in response", async () => {
    const { MindboxClient } = await import("../client.js");
    const client = new MindboxClient();

    mockMindboxResponse({ status: "InternalServerError", errorMessage: "Something broke" });
    await expect(client.operation("Test.Op", {})).rejects.toThrow("Mindbox:");
  });
});

describe("get_customer handler", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should return customer data on success", async () => {
    const { handleGetCustomer } = await import("../tools/customer.js");

    mockMindboxResponse({
      status: "Success",
      customer: {
        email: "test@example.com",
        firstName: "Иван",
        lastName: "Петров",
        mobilePhone: "+79001234567",
      },
      customerSegmentations: [
        { segmentation: { name: "VIP" }, segment: { name: "Gold" } },
      ],
    });

    const result = await handleGetCustomer({ operation: "Website.GetCustomerInfo", email: "test@example.com" });
    const parsed = JSON.parse(result);

    expect(parsed.статус).toBe("Success");
    expect(parsed.клиент.email).toBe("test@example.com");
    expect(parsed.клиент.имя).toBe("Иван");
    expect(parsed.сегменты).toHaveLength(1);
    expect(parsed.сегменты[0].сегмент).toBe("Gold");
  });

  it("should require at least one identifier", async () => {
    const { handleGetCustomer } = await import("../tools/customer.js");
    const result = await handleGetCustomer({ operation: "Website.GetCustomerInfo" });
    expect(result).toContain("Укажите хотя бы один идентификатор");
  });
});

describe("create_order handler", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should send order data correctly", async () => {
    const { handleCreateOrder } = await import("../tools/order.js");

    mockMindboxResponse({
      status: "Success",
      order: { ids: { externalId: "ORD-1" }, totalPrice: 1000, discountedTotalPrice: 900 },
    });

    const result = await handleCreateOrder({
      operation: "Website.CreateOrder",
      customer_email: "test@example.com",
      order_id: "ORD-1",
      lines: [{ product_id: "P1", quantity: 2, price: 500 }],
      total_price: 1000,
    });
    const parsed = JSON.parse(result);

    expect(parsed.статус).toBe("Success");
    expect(parsed.заказ.сумма).toBe(1000);
  });
});

describe("get_segments handler", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should return segments list", async () => {
    const { handleGetSegments } = await import("../tools/segments.js");

    mockMindboxResponse({
      status: "Success",
      customerSegmentations: [
        { segmentation: { name: "Лояльность" }, segment: { name: "VIP", customerCount: 150 } },
        { segmentation: { name: "Активность" }, segment: { name: "Активный", customerCount: 5000 } },
      ],
    });

    const result = await handleGetSegments({ operation: "Website.GetCustomerSegments", email: "test@example.com" });
    const parsed = JSON.parse(result);

    expect(parsed.сегменты).toHaveLength(2);
    expect(parsed.сегменты[0].количество_клиентов).toBe(150);
  });

  it("should handle no segments found", async () => {
    const { handleGetSegments } = await import("../tools/segments.js");

    mockMindboxResponse({ status: "Success", customerSegmentations: [] });
    const result = await handleGetSegments({ operation: "Website.GetCustomerSegments", phone: "+79001234567" });
    expect(result).toContain("не найдены");
  });
});

describe("update_customer handler", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should send update data correctly", async () => {
    const { handleUpdateCustomer } = await import("../tools/update-customer.js");

    mockMindboxResponse({
      status: "Success",
      customer: { ids: { externalId: "C1" }, email: "updated@example.com", firstName: "Мария" },
    });

    const result = await handleUpdateCustomer({
      operation: "Website.UpdateCustomer",
      email: "updated@example.com",
      first_name: "Мария",
    });
    const parsed = JSON.parse(result);

    expect(parsed.статус).toBe("Success");
    expect(parsed.клиент.имя).toBe("Мария");
  });

  it("should require identifier", async () => {
    const { handleUpdateCustomer } = await import("../tools/update-customer.js");
    const result = await handleUpdateCustomer({ operation: "Website.UpdateCustomer" });
    expect(result).toContain("Укажите хотя бы один идентификатор");
  });
});

describe("run_operation handler", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should forward arbitrary operation", async () => {
    const { handleRunOperation } = await import("../tools/run-operation.js");

    mockMindboxResponse({ status: "Success", custom: "data" });
    const result = await handleRunOperation({ operation: "Custom.Operation", body: { key: "value" } });
    const parsed = JSON.parse(result);

    expect(parsed.status).toBe("Success");
    expect(parsed.custom).toBe("data");
  });
});

describe("get_product_list handler", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should return product list", async () => {
    const { handleGetProductList } = await import("../tools/product-list.js");

    mockMindboxResponse({
      status: "Success",
      products: [{ name: "Товар 1" }, { name: "Товар 2" }],
      totalCount: 2,
    });

    const result = await handleGetProductList({ operation: "Website.GetProductList", page: 1, page_size: 20 });
    const parsed = JSON.parse(result);

    expect(parsed.статус).toBe("Success");
    expect(parsed.товары).toHaveLength(2);
  });
});

describe("env var compatibility", () => {
  it("should accept MINDBOX_API_KEY via constructor", async () => {
    const { MindboxClient } = await import("../client.js");
    // Constructor accepts explicit params
    const client = new MindboxClient("direct-key", "direct-endpoint");
    expect(client).toBeDefined();
  });
});
