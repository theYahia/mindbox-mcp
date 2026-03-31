import { z } from "zod";
import { MindboxClient } from "../client.js";
import type { MindboxOperationResponse } from "../types.js";

const client = new MindboxClient();

const orderLineSchema = z.object({
  product_id: z.string().describe("ID товара"),
  product_name: z.string().optional().describe("Название товара"),
  quantity: z.number().positive().describe("Количество"),
  price: z.number().describe("Цена за единицу"),
});

export const createOrderSchema = z.object({
  operation: z.string().default("Website.CreateOrder").describe("Системное имя операции Mindbox для создания заказа"),
  customer_email: z.string().optional().describe("Email клиента"),
  customer_phone: z.string().optional().describe("Телефон клиента"),
  customer_external_id: z.string().optional().describe("Внешний ID клиента"),
  order_id: z.string().describe("ID заказа во внешней системе"),
  lines: z.array(orderLineSchema).min(1).describe("Строки заказа (товары)"),
  total_price: z.number().describe("Общая сумма заказа"),
});

export async function handleCreateOrder(params: z.infer<typeof createOrderSchema>): Promise<string> {
  const customer: Record<string, unknown> = {};
  if (params.customer_email) customer.email = params.customer_email;
  if (params.customer_phone) customer.mobilePhone = params.customer_phone;
  if (params.customer_external_id) customer.ids = { externalId: params.customer_external_id };

  const order = {
    ids: { externalId: params.order_id },
    lines: params.lines.map(l => ({
      product: { ids: { externalId: l.product_id }, name: l.product_name },
      quantity: l.quantity,
      basePricePerItem: l.price,
    })),
    totalPrice: params.total_price,
  };

  const result = (await client.operation(params.operation, {
    customer,
    order,
  })) as MindboxOperationResponse;

  return JSON.stringify({
    статус: result.status,
    заказ: result.order ? {
      ids: result.order.ids,
      сумма: result.order.totalPrice,
      сумма_со_скидкой: result.order.discountedTotalPrice,
    } : null,
    ошибка: result.errorMessage,
  }, null, 2);
}
