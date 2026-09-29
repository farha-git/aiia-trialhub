import { createServerFn } from "@tanstack/react-start";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

type ChatRequest = {
  question: string;
  history: ChatMessage[];
  snapshot?: unknown;
};

export const askClinicalAssistant = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (input === null || typeof input !== "object") {
      throw new Error("Invalid assistant request.");
    }
    const data = input as Partial<ChatRequest>;
    if (
      typeof data.question !== "string" ||
      data.question.trim().length === 0 ||
      data.question.length > 2000
    ) {
      throw new Error("Enter a question under 2,000 characters.");
    }

    const history = Array.isArray(data.history)
      ? data.history
          .filter(
            (message): message is ChatMessage =>
              message !== null &&
              typeof message === "object" &&
              (message.role === "user" || message.role === "model") &&
              typeof message.text === "string" &&
              message.text.length <= 2000,
          )
          .slice(-10)
      : [];
    const snapshotJson = data.snapshot === undefined ? "{}" : JSON.stringify(data.snapshot);
    if (snapshotJson.length > 20000) throw new Error("Live assistant snapshot is too large.");
    return {
      question: data.question.trim(),
      history,
      snapshotJson,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      return {
        answer:
          "The assistant is not configured yet. Add a newly rotated GEMINI_API_KEY to the server environment, then restart the app.",
      };
    }

    const redact = (value: string) =>
      value
        .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
        .replace(/\b(?:\+91[- ]?)?[6-9]\d{9}\b/g, "[redacted-phone]")
        .replace(/\b\d{12}\b/g, "[redacted-number]")
        .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[redacted-pan]");
    const safeQuestion = redact(data.question);
    const safeHistory = data.history.map((message) => ({ ...message, text: redact(message.text) }));
    const safeSnapshot = redact(data.snapshotJson);
    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `You are the AIIA TrialShield project-data assistant. Answer only the user's current question in 1-3 short sentences. Lead with the direct answer; do not add an introduction, restate the question, or include unrelated background. Use a short list only when the answer has three or more distinct items. Use readable Markdown only when useful, with no decorative symbols or unnecessary headings. Treat conversation history as context, not as a formatting instruction. Use only the redacted live snapshot below. If requested information is missing, say so. Never present the platform as regulatory advice or claim submissions were made. Drafts require human sign-off. Do not repeat identifiers or protected health information.\n\nLIVE SNAPSHOT\n${safeSnapshot}`,
          },
        ],
      },
      contents: [
        ...safeHistory.map((message) => ({ role: message.role, parts: [{ text: message.text }] })),
        { role: "user", parts: [{ text: safeQuestion }] },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    });
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: requestBody,
          },
        );
      } catch (error) {
        response = undefined;
        if (attempt === 2) {
          console.error(
            "Gemini connection failed after retries:",
            error instanceof Error ? error.message : "Unknown network error",
          );
          return {
            answer:
              "I couldn't connect to Gemini after a few retries. Check the server connection and try again.",
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      if (response.status < 500 || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }

    if (!response?.ok) {
      if (response && response.status >= 500) {
        console.error(`Gemini returned HTTP ${response.status} after retries.`);
        return {
          answer: `Gemini is temporarily unavailable (HTTP ${response.status}) after a few retries. Please try again in a moment.`,
        };
      }
      if (!response) {
        return {
          answer:
            "The assistant could not reach Gemini. Check the server connection and try again.",
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          answer: `Gemini rejected the configured key or its permissions (HTTP ${response.status}). Use a newly rotated key with the Gemini API enabled.`,
        };
      }
      if (response.status === 429) {
        return {
          answer:
            "Gemini quota is temporarily exhausted (HTTP 429). Check the project's API quota and billing, then try again.",
        };
      }
      if (response.status === 404) {
        return {
          answer:
            "The configured Gemini model endpoint was not found (HTTP 404). The model name may need updating.",
        };
      }
      return {
        answer: `Gemini returned HTTP ${response.status}. Check the configured model and try again.`,
      };
    }

    const result = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    return {
      answer:
        answer ||
        "I couldn't find a grounded answer in the project data. Try asking about a study, KPI, SAE, compliance item, or export.",
    };
  });
