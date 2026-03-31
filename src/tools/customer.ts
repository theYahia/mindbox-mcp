import { z } from "zod";
import { MindboxClient } from "../client.js";
import type { MindboxOperationResponse } from "../types.js";

const client = new MindboxClient();

export const getCustomerSchema = z.object({
  operation: z.string().default("Website.GetCustomerInfo").describe("Системное имя операции Mindbox для получения данных клиента"),
  email: z.string().optional().describe("Email клиента для поиска"),
  phone: z.string().optional().describe("Телефон клиента для поиска"),
  external_id: z.string().optional().describe("Внешний ID клиента"),
});

export async function handleGetCustomer(params: z.infer<typeof getCustomerSchema>): Promise<string> {
  const customer: Record<string, unknown> = {};
  if (params.email) customer.email = params.email;
  if (params.phone) customer.mobilePhone = params.phone;
  if (params.external_id) customer.ids = { externalId: params.external_id };

  if (Object.keys(customer).length === 0) {
    return "Укажите хотя бы один идентификатор клиента: email, phone или external_id.";
  }

  const result = (await client.operation(params.operation, { customer })) as MindboxOperationResponse;

  if (result.status !== "Success" || !result.customer) {
    return `Клиент не найден. Статус: ${result.status}. ${result.errorMessage ?? ""}`;
  }

  const c = result.customer;
  return JSON.stringify({
    статус: result.status,
    клиент: {
      ids: c.ids,
      email: c.email,
      телефон: c.mobilePhone,
      имя: c.firstName,
      фамилия: c.lastName,
      дата_рождения: c.birthDate,
      пол: c.sex,
      регион: c.area?.name,
    },
    сегменты: result.customerSegmentations?.map(s => ({
      сегментация: s.segmentation?.name,
      сегмент: s.segment?.name,
    })),
  }, null, 2);
}
