/**
 * DeepSeek API Client
 * 統一封裝 DeepSeek Chat API，支援純文本對話
 */
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
function getDeepSeekApiKey(): string {
    // 用动态取值，避免 Next 在构建时把空的 process.env.DEEPSEEK_API_KEY 写死进产物
    const raw = process.env["DEEPSEEK_API_KEY"] ||
        process.env["DEEPSEEK_KEY"] ||
        "";
    return raw.trim();
}
export interface DeepSeekMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface DeepSeekStreamOptions {
    messages: DeepSeekMessage[];
    onChunk?: (text: string) => void;
    signal?: AbortSignal;
}
export interface DeepSeekOptions {
    messages: DeepSeekMessage[];
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    signal?: AbortSignal;
}
const DEFAULT_TIMEOUT = 120000;
export class DeepSeekError extends Error {
    statusCode?: number;
    isTimeout: boolean;
    constructor(message: string, statusCode?: number, isTimeout = false) {
        super(message);
        this.name = "DeepSeekError";
        this.statusCode = statusCode;
        this.isTimeout = isTimeout;
    }
}
function buildError(message: string, statusCode?: number, isTimeout = false): DeepSeekError {
    return new DeepSeekError(message, statusCode, isTimeout);
}
/**
 * 發送非流式 Chat 請求
 */
export async function chat(options: DeepSeekOptions): Promise<string> {
    const { messages, temperature, maxTokens, timeout = DEFAULT_TIMEOUT, signal, } = options;
    const apiKey = getDeepSeekApiKey();
    if (!apiKey) {
        throw buildError("DEEPSEEK_API_KEY is not configured", 500);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages,
                temperature: temperature ?? 0.7,
                max_tokens: maxTokens ?? 4096,
            }),
            signal: signal ?? controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorText = await response.text();
            throw buildError(`DeepSeek API error ${response.status}: ${errorText}`, response.status);
        }
        const data = (await response.json()) as {
            choices: Array<{
                message: {
                    content: string | null;
                };
            }>;
            usage?: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
            };
        };
        const content = data.choices[0]?.message?.content;
        if (!content) {
            throw buildError("DeepSeek returned empty content", 200);
        }
        return content;
    }
    catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
            throw buildError("DeepSeek API request timed out", 504, true);
        }
        throw err;
    }
}
/**
 * 發送流式 Chat 請求（適用於長回應）
 */
export async function* streamChat(options: DeepSeekStreamOptions): AsyncGenerator<string> {
    const { messages, onChunk, signal } = options;
    const apiKey = getDeepSeekApiKey();
    if (!apiKey) {
        throw buildError("DEEPSEEK_API_KEY is not configured", 500);
    }
    const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages,
            stream: true,
        }),
        signal,
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw buildError(`DeepSeek API error ${response.status}: ${errorText}`, response.status);
    }
    if (!response.body) {
        throw buildError("DeepSeek returned empty response body", 200);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
                if (!line.startsWith("data: "))
                    continue;
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]")
                    return;
                try {
                    const chunk = JSON.parse(jsonStr) as {
                        choices?: Array<{
                            delta?: {
                                content?: string;
                            };
                        }>;
                    };
                    const text = chunk.choices?.[0]?.delta?.content;
                    if (text) {
                        onChunk?.(text);
                        yield text;
                    }
                }
                catch {
                    // ignore parse errors for incomplete chunks
                }
            }
        }
    }
    finally {
        reader.releaseLock();
    }
}
/**
 * 檢查 API Key 是否已配置
 */
export function isConfigured(): boolean {
    return getDeepSeekApiKey().length > 0;
}
