import { z } from "zod";
import { MindboxClient } from "../client.js";

const client = new MindboxClient();

export const getProductListSchema = z.object({
  operation: z.string().default("Website.GetProductList").describe("Системное имя операции Mindbox для получения списка товаров"),
  page: z.number().optional().default(1).describe("Номер страницы"),
  page_size: z.number().optional().default(20).describe("Размер страницы"),
});

export async function handleGetProductList(params: z.infer<typeof getProductListSchema>): Promise<string> {
  const result = (await client.operation(params.operation, {
    pageNumber: params.page,
    itemsPerPage: params.page_size,
  })) as Record<string, unknown>;

  if (result.status !== "Success") {
    return `Ошибка получения списка товаров. Статус: ${result.status}. ${(result as any).errorMessage ?? ""}`;
  }

  return JSON.stringify({
    статус: result.status,
    товары: result.products ?? result.productList ?? [],
    общее_количество: result.totalCount,
  }, null, 2);
}
