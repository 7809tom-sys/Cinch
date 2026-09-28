import { extractJsonText } from "./ai-generate";
import { geminiMenuVisionModels } from "./menu-vision-copy";
import {
  loadStoredProviderKeys,
  resolveProviderApiKey,
} from "./provider-keys";
import {
  normalizeParsedMenuJson,
  type MenuUploadAttachment,
  type ParsedMenuJson,
} from "./seed-delivery";

export const PAPER_MENU_VISION_SYSTEM = `You parse paper takeout menus from photos or a PDF.
Reply with JSON only: { "items": [ { "category", "item_name", "price", "description", "modifiers": [ { "group", "required", "options" } ] } ] }.
modifiers options are a string or { "name", "price" }. Required groups (size, protein, cheese) set required true. Add-ons are required false.
Do not invent a whole restaurant if the pages are blank. Prices are numbers in USD.`;

export function parsedMenuFromVisionText(text: string): ParsedMenuJson {
  return normalizeParsedMenuJson(JSON.parse(extractJsonText(text)));
}

function visionParts(attachments: MenuUploadAttachment[]) {
  return attachments
    .filter((file) => file.dataBase64?.trim())
    .map((file) => {
      const pdf =
        /pdf/i.test(file.type ?? "") || /\.pdf$/i.test(file.name);
      return {
        name: file.name,
        mime: pdf ? "application/pdf" : file.type || "image/jpeg",
        data: file.dataBase64!.replace(/\s/g, ""),
      };
    });
}

async function parseWithGeminiModel(
  apiKey: string,
  parts: ReturnType<typeof visionParts>,
  model: string,
): Promise<ParsedMenuJson> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  );
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PAPER_MENU_VISION_SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Parse this paper takeout menu (${parts.map((part) => part.name).join(", ")}).`,
            },
            ...parts.map((part) => ({
              inlineData: { mimeType: part.mime, data: part.data },
            })),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini ${response.status}: ${body.slice(0, 240)}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty menu parse.");
  return parsedMenuFromVisionText(text);
}

async function parseWithGemini(
  apiKey: string,
  parts: ReturnType<typeof visionParts>,
): Promise<ParsedMenuJson> {
  const models = geminiMenuVisionModels(process.env.GOOGLE_AI_MODEL);
  const errors: string[] = [];
  for (const model of models) {
    try {
      return await parseWithGeminiModel(apiKey, parts, model);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gemini failed.";
      errors.push(message);
      if (!/404|not found for API version|is not found/i.test(message)) {
        throw error;
      }
    }
  }
  throw new Error(errors[0] || "Gemini vision failed.");
}

async function parseWithClaude(
  apiKey: string,
  parts: ReturnType<typeof visionParts>,
): Promise<ParsedMenuJson> {
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20241022";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.2,
      system: PAPER_MENU_VISION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Parse this paper takeout menu (${parts.map((part) => part.name).join(", ")}).`,
            },
            ...parts.map((part) =>
              part.mime === "application/pdf"
                ? {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: part.data,
                    },
                  }
                : {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: part.mime,
                      data: part.data,
                    },
                  },
            ),
          ],
        },
      ],
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude ${response.status}: ${body.slice(0, 240)}`);
  }
  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Claude returned an empty menu parse.");
  return parsedMenuFromVisionText(text);
}

export async function parsePaperMenuWithVision(
  attachments: MenuUploadAttachment[],
): Promise<
  | { ok: true; parsed: ParsedMenuJson; model: string }
  | { ok: false; error: string }
> {
  const parts = visionParts(attachments);
  if (parts.length === 0) {
    return { ok: false, error: "Those files had no photo or PDF bytes." };
  }

  const stored = await loadStoredProviderKeys();
  const google = resolveProviderApiKey("google", stored);
  const anthropic = resolveProviderApiKey("anthropic", stored);
  if (!google && !anthropic) {
    return {
      ok: false,
      error: "No Gemini or Claude vision key is wired.",
    };
  }

  const errors: string[] = [];
  if (google) {
    try {
      const parsed = await parseWithGemini(google, parts);
      if (parsed.items.length > 0) {
        return { ok: true, parsed, model: "gemini-flash" };
      }
      errors.push("Gemini returned no plates.");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Gemini failed.");
    }
  }
  if (anthropic) {
    try {
      const parsed = await parseWithClaude(anthropic, parts);
      if (parsed.items.length > 0) {
        return { ok: true, parsed, model: "claude-vision" };
      }
      errors.push("Claude returned no plates.");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Claude failed.");
    }
  }
  return {
    ok: false,
    error: errors[0] || "Vision parse failed.",
  };
}
