import { z } from "zod";
import { MindboxClient } from "../client.js";
import type { MindboxOperationResponse } from "../types.js";

const client = new MindboxClient();

export const getSegmentsSchema = z.object({
  operation: z.string().default("Website.GetCustomerSegments").describe("Системное имя операции Mindbox для получения сегментов клиента"),
  email: z.string().optional().describe("Email клиента"),
  phone: z.string().optional().describe("Телефон клиента"),
  external_id: z.string().optional().describe("Внешний ID клиента"),
});

export async function handleGetSegments(params: z.infer<typeof getSegmentsSchema>): Promise<string> {
  const customer: Record<string, unknown> = {};
  if (params.email) customer.email = params.email;
  if (params.phone) customer.mobilePhone = params.phone;
  if (params.external_id) customer.ids = { externalId: params.external_id };

  if (Object.keys(customer).length === 0) {
    return "Укажите хотя бы один идентификатор клиента: email, phone или external_id.";
  }

  const result = (await client.operation(params.operation, { customer })) as MindboxOperationResponse;

  if (result.status !== "Success") {
    return `Ошибка получения сегментов. Статус: ${result.status}. ${result.errorMessage ?? ""}`;
  }

  const segments = result.customerSegmentations ?? [];

  if (segments.length === 0) {
    return "Сегменты для данного клиента не найдены.";
  }

  return JSON.stringify({
    статус: result.status,
    сегменты: segments.map(s => ({
      сегментация: s.segmentation?.name,
      сегмент: s.segment?.name,
      количество_клиентов: s.segment?.customerCount,
    })),
  }, null, 2);
}
