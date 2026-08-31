// On-device OpenAI key + one JSON chat completion.
// The key is stored in localStorage only (this device). Never commit it.
// GitHub Pages is static, so the browser talks to api.openai.com directly.

const STORAGE = "sam-caffeinated:openai-key";
const MODEL = "gpt-4o-mini";

export function getOpenAiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE)?.trim();
    if (saved) return saved;
  } catch { /* private mode */ }
  const fromEnv = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  return fromEnv || "";
}

export function setOpenAiKey(key: string): void {
  const k = key.trim();
  try {
    if (k) localStorage.setItem(STORAGE, k);
    else localStorage.removeItem(STORAGE);
  } catch { /* ignore */ }
}

export class AiParseError extends Error {
  constructor(message: string, readonly code: "no_key" | "http" | "parse") {
    super(message);
    this.name = "AiParseError";
  }
}

export async function completeJson(system: string, user: string): Promise<unknown> {
  const key = getOpenAiKey();
  if (!key) throw new AiParseError("Add an OpenAI API key to read notes with AI.", "no_key");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json() as { error?: { message?: string } };
      if (err.error?.message) detail = err.error.message;
    } catch { /* keep statusText */ }
    throw new AiParseError(`AI parse failed (${res.status}): ${detail}`, "http");
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiParseError("AI returned an empty response.", "parse");
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new AiParseError("AI returned invalid JSON.", "parse");
  }
}
