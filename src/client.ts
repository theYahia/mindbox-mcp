const BASE_URL = "https://api.mindbox.ru/v3";
const TIMEOUT = 15_000;

export class MindboxClient {
  private secretKey: string;
  private endpointId: string;

  constructor(secretKey?: string, endpointId?: string) {
    this.secretKey = secretKey
      ?? process.env.MINDBOX_API_KEY
      ?? process.env.MINDBOX_SECRET_KEY
      ?? "";
    this.endpointId = endpointId
      ?? process.env.MINDBOX_ENDPOINT_ID
      ?? "";
    if (!this.secretKey) {
      throw new Error(
        "Переменная окружения MINDBOX_API_KEY (или MINDBOX_SECRET_KEY) обязательна. " +
        "Получите ключ в личном кабинете Mindbox."
      );
    }
    if (!this.endpointId) {
      throw new Error(
        "Переменная окружения MINDBOX_ENDPOINT_ID обязательна. " +
        "Укажите ID эндпоинта Mindbox."
      );
    }
  }

  async operation(operationName: string, body: Record<string, unknown>): Promise<unknown> {
    const url = `${BASE_URL}/operations`;
    const params = new URLSearchParams({
      endpointId: this.endpointId,
      operation: operationName,
    });
    const fullUrl = `${url}?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Mindbox secretKey="${this.secretKey}"`,
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Mindbox HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();

      if (data && typeof data === "object" && "status" in data && (data as Record<string, unknown>).status === "InternalServerError") {
        throw new Error(`Mindbox: ${JSON.stringify((data as Record<string, unknown>).errorMessage)}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Mindbox: таймаут запроса (15 секунд). Попробуйте позже.");
      }
      throw error;
    }
  }
}
