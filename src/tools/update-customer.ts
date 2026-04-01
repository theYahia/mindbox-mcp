import { z } from "zod";
import { MindboxClient } from "../client.js";
import type { MindboxOperationResponse } from "../types.js";

const client = new MindboxClient();

export const updateCustomerSchema = z.object({
  operation: z.string().default("Website.UpdateCustomer").describe("Системное имя операции Mindbox для обновления клиента"),
  email: z.string().optional().describe("Email клиента"),
  phone: z.string().optional().describe("Телефон клиента"),
  external_id: z.string().optional().describe("Внешний ID клиента"),
  first_name: z.string().optional().describe("Имя"),
  last_name: z.string().optional().describe("Фамилия"),
  birth_date: z.string().optional().describe("Дата рождения (YYYY-MM-DD)"),
  custom_fields: z.record(z.unknown()).optional().describe("Кастомные поля"),
});

export async function handleUpdateCustomer(params: z.infer<typeof updateCustomerSchema>): Promise<string> {
  const customer: Record<string, unknown> = {};
  if (params.email) customer.email = params.email;
  if (params.phone) customer.mobilePhone = params.phone;
  if (params.external_id) customer.ids = { externalId: params.external_id };
  if (params.first_name) customer.firstName = params.first_name;
  if (params.last_name) customer.lastName = params.last_name;
  if (params.birth_date) customer.birthDate = params.birth_date;
  if (params.custom_fields) customer.customFields = params.custom_fields;

  if (!params.email && !params.phone && !params.external_id) {
    return "Укажите хотя бы один идентификатор клиента: email, phone или external_id.";
  }

  const result = (await client.operation(params.operation, { customer })) as MindboxOperationResponse;

  return JSON.stringify({
    статус: result.status,
    клиент: result.customer ? {
      ids: result.customer.ids,
      email: result.customer.email,
      имя: result.customer.firstName,
      фамилия: result.customer.lastName,
    } : null,
    ошибка: result.errorMessage,
  }, null, 2);
}
