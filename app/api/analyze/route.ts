import { NextResponse } from "next/server";

type Verdict = "legit" | "ghost_job" | "scam" | "suspicious";

type AnalysisResult = {
  verdict: Verdict;
  confidence: number;
  reasons: string[];
  red_flags: string[];
  summary: string;
  advice: string;
  hr_translation: {
    original: string;
    meaning: string;
  }[];
  who_should_apply: {
    recommended_roles: string[];
    skill_level: string;
    apply_if: string[];
    do_not_apply_if: string[];
  };
};

// AI Provider configurations
const PROVIDERS = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      "google/gemma-4-26b-a4b-it:free",
      "google/gemma-4-31b-it:free"
    ],
    key: process.env.OPENROUTER_KEY
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768"
    ],
    key: process.env.GROQ_KEY
  },
  together: {
    url: "https://api.together.xyz/v1/chat/completions",
    models: [
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1"
    ],
    key: process.env.TOGETHER_KEY
  }
} as const;
const VALID_VERDICTS = new Set<Verdict>([
  "legit",
  "ghost_job",
  "scam",
  "suspicious"
]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { jobText } = await request.json();

    if (typeof jobText !== "string" || !jobText.trim()) {
      return NextResponse.json(
        { error: "A non-empty job description is required." },
        { status: 400 }
      );
    }

    const availableProviders = Object.entries(PROVIDERS).filter(
      ([_, config]) => config.key
    );

    if (availableProviders.length === 0) {
      return NextResponse.json(
        { error: "No AI provider API keys configured. Set GROQ_KEY, TOGETHER_KEY, or OPENROUTER_KEY." },
        { status: 500 }
      );
    }

    const prompt = `You are an expert HR fraud detection and job-market reality analysis system.

Analyze the job post carefully. Detect ghost-job signals, scam signals, suspicious hiring patterns, vague requirements, unrealistic expectations, missing company details, compensation issues, pressure tactics, and corporate phrases that hide the real working conditions.

Return ONLY valid JSON. Do not include markdown, comments, code fences, explanations, or extra text.

Use this exact structure and always include every key:

{
  "verdict": "legit | ghost_job | scam | suspicious",
  "confidence": 0-1,
  "reasons": ["short reason"],
  "red_flags": ["specific red flag"],
  "summary": "brief plain-English summary",
  "advice": "practical advice for the applicant",
  "hr_translation": [
    {
      "original": "corporate phrase from the post",
      "meaning": "real-world meaning"
    }
  ],
  "who_should_apply": {
    "recommended_roles": ["role type"],
    "skill_level": "junior | mid | senior | lead | unclear",
    "apply_if": ["condition that makes this job a fit"],
    "do_not_apply_if": ["condition that makes this job a bad fit"]
  }
}

Rules:
- verdict must be exactly one of: legit, ghost_job, scam, suspicious.
- confidence must be a number between 0 and 1.
- If there are no corporate phrases to decode, return an empty hr_translation array.
- Infer the real seniority and role type from the responsibilities, not only from the title.
- Keep all array items concise and specific to the job post.

Job Post:
${jobText.trim()}`;

    const content = await callAIProviders(availableProviders, prompt);

    const parsed = parseModelJson(content);
    const result = normalizeResult(parsed);

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze the job post."
      },
      { status: 500 }
    );
  }
}

async function callAIProviders(providers: Array<[string, typeof PROVIDERS[keyof typeof PROVIDERS]]>, prompt: string) {
  let lastError = "";

  for (const [providerName, providerConfig] of providers) {
    for (const model of providerConfig.models) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const content = await requestAIModel(providerConfig, prompt, model, providerName);

          if (content) {
            return content;
          }

          lastError = `The ${providerName} model returned an empty response.`;
        } catch (error) {
          lastError = error instanceof Error ? error.message : `${providerName} request failed.`;
        }

        if (attempt === 1) {
          await sleep(1000);
        }
      }
    }
  }

  throw new Error(
    lastError
      ? `All AI providers are busy right now. Please try again in a few seconds.`
      : "All AI providers are busy right now. Please try again in a few seconds."
  );
}

async function requestAIModel(
  providerConfig: typeof PROVIDERS[keyof typeof PROVIDERS],
  prompt: string,
  model: string,
  providerName: string
) {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), 30000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Set authorization based on provider
    if (providerName === "openrouter") {
      headers.Authorization = `Bearer ${providerConfig.key}`;
      headers["HTTP-Referer"] = "https://ghost-job-detector.vercel.app";
      headers["X-Title"] = "Ghost Job Detector";
    } else {
      headers.Authorization = `Bearer ${providerConfig.key}`;
    }

    const response = await fetch(providerConfig.url, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You return strict JSON only. Never include markdown or prose outside JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const details = await safeReadText(response);
      throw new Error(
        details || getProviderErrorMessage(response.status, providerName)
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    return typeof content === "string" && content.trim() ? content : "";
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function sanitizeOpenRouterError(details: string) {
  if (!details.trim()) return "";

  try {
    const parsed = JSON.parse(details);
    const message =
      parsed?.error?.message || parsed?.message || parsed?.error || details;
    return String(message).slice(0, 500);
  } catch {
    return details
      .replace(/sk-or-v1-[A-Za-z0-9]+/g, "[redacted-openrouter-key]")
      .slice(0, 500);
  }
}

function getProviderErrorMessage(status: number, providerName: string) {
  const provider = providerName.charAt(0).toUpperCase() + providerName.slice(1);
  
  if (status === 401) return `${provider} rejected the API key.`;
  if (status === 402) return `${provider} says this key has no available credits.`;
  if (status === 404) return `${provider} could not find the configured model.`;
  if (status === 429) return `${provider} rate limit reached. Try again shortly.`;
  return `${provider} request failed.`;
}

function parseModelJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("The model did not return valid JSON.");
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

function normalizeResult(value: unknown): AnalysisResult {
  if (!value || typeof value !== "object") {
    throw new Error("The model response was not a JSON object.");
  }

  const input = value as Partial<AnalysisResult>;
  const verdict = VALID_VERDICTS.has(input.verdict as Verdict)
    ? (input.verdict as Verdict)
    : "suspicious";
  const confidence =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? Math.max(0, Math.min(1, input.confidence))
      : 0.5;

  return {
    verdict,
    confidence,
    reasons: toStringArray(input.reasons),
    red_flags: toStringArray(input.red_flags),
    summary: typeof input.summary === "string" ? input.summary : "",
    advice: typeof input.advice === "string" ? input.advice : "",
    hr_translation: toTranslationArray(input.hr_translation),
    who_should_apply: normalizeWhoShouldApply(input.who_should_apply)
  };
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTranslationArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const translation = item as {
        original?: unknown;
        meaning?: unknown;
      };

      if (
        typeof translation.original !== "string" ||
        typeof translation.meaning !== "string"
      ) {
        return null;
      }

      return {
        original: translation.original.trim(),
        meaning: translation.meaning.trim()
      };
    })
    .filter(
      (
        item
      ): item is {
        original: string;
        meaning: string;
      } => Boolean(item?.original && item.meaning)
    );
}

function normalizeWhoShouldApply(
  value: unknown
): AnalysisResult["who_should_apply"] {
  if (!value || typeof value !== "object") {
    return emptyWhoShouldApply();
  }

  const input = value as Partial<AnalysisResult["who_should_apply"]>;

  return {
    recommended_roles: toStringArray(input.recommended_roles),
    skill_level:
      typeof input.skill_level === "string" && input.skill_level.trim()
        ? input.skill_level.trim()
        : "unclear",
    apply_if: toStringArray(input.apply_if),
    do_not_apply_if: toStringArray(input.do_not_apply_if)
  };
}

function emptyWhoShouldApply(): AnalysisResult["who_should_apply"] {
  return {
    recommended_roles: [],
    skill_level: "unclear",
    apply_if: [],
    do_not_apply_if: []
  };
}
