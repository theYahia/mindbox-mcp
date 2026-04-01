import { z } from "zod";
import { MindboxClient } from "../client.js";

const client = new MindboxClient();

export const runOperationSchema = z.object({
  operation: z.string().describe("Системное имя операции Mindbox"),
  body: z.record(z.unknown()).default({}).describe("Тело запроса (JSON)"),
});

export async function handleRunOperation(params: z.infer<typeof runOperationSchema>): Promise<string> {
  const result = await client.operation(params.operation, params.body);
  return JSON.stringify(result, null, 2);
}
