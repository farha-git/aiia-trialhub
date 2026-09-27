import { createServerFn } from "@tanstack/react-start";

import { clinicalReportRows } from "@/lib/clinical-report";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

type ChatRequest = {
  question: string;
  history: ChatMessage[];
};

const projectContext = [
  "AIIA TrialShield is a frontend CTMS demonstration for Ayurveda research (SIH Problem Statement ID26046). All figures and records below are synthetic, illustrative demo data, not live clinical records.",
  `Portfolio sample study records: ${JSON.stringify(clinicalReportRows)}.`,
  "Portfolio dashboard summary: 12 active studies; 482 enrolled of 700 target (69%); 4 open serious adverse events; 90% mean data completeness across the four sample records.",
  "Safety workspace: SAE-2026-014 acute hepatic injury for AIIA-OA-024 has an expedited ethics notification due in about 18 hours; SAE-2026-011 hospitalisation has an overdue follow-up; six gastrointestinal events at Site 03 are under signal review; SAE-2026-009 fracture has documented causality. The dashboard reports 4 open SAEs, 2 expedited reviews and 1 overdue follow-up.",
  "Compliance workspace: IEC/AIIA/2026/042 approval is valid through 18 March 2027; AIIA-OA-024 has a CTRI secondary-outcome wording mismatch against protocol v3.2; an expired GCP certificate is flagged at Site 04; a superseded consent form is flagged for AIIA-DM-031.",
  "The demo includes portfolio, studies, safety, compliance, analytics, documents and exports workspaces. Exports currently include summary PDF/Excel/CSV/JSON/XML and an illustrative FHIR R4 Bundle. The export files are not validated SDTM, ADaM, Define-XML or ABDM submissions.",
  "The app has no connected CTMS backend, persistence, live EDC/HIS/CTRI feed, production RBAC, or immutable audit service. Do not claim that any of these are implemented.",
].join("\n");

export const askClinicalAssistant = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (input === null || typeof input !== "object") {
      throw new Error("Invalid assistant request.");
    }
    const data = input as Partial<ChatRequest>;
    if (typeof data.question !== "string" || data.question.trim().length === 0 || data.question.length > 2000) {
      throw new Error("Enter a question under 2,000 characters.");
    }

    const history = Array.isArray(data.history) ? data.history.filter((message): message is ChatMessage =>
      message !== null &&
      typeof message === "object" &&
      (message.role === "user" || message.role === "model") &&
      typeof message.text === "string" &&
      message.text.length <= 2000,
    ).slice(-10) : [];
    return {
      question: data.question.trim(),
      history,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { answer: "The assistant is not configured yet. Add a newly rotated GEMINI_API_KEY to the server environment, then restart the app." };
    }

    const requestBody = JSON.stringify({
        systemInstruction: {
          parts: [{
            text: `You are the AIIA TrialShield project-data assistant. Answer the user's question directly and concisely using only the project context below. Use plain text without Markdown formatting. If information is missing, say it is not available in this demo instead of guessing. Keep all numbers consistent with the context. Clearly distinguish illustrative capabilities from implemented ones. Never present this demo as regulatory advice or a validated clinical system. Do not request or repeat participant identifiers or protected health information.\n\nPROJECT CONTEXT\n${projectContext}`,
          }],
        },
        contents: [
          ...data.history.map((message) => ({ role: message.role, parts: [{ text: message.text }] })),
          { role: "user", parts: [{ text: data.question }] },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
    });
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: requestBody,
      });
      if (response.status < 500 || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }

    if (!response?.ok) {
      if (response && response.status >= 500) {
        return { answer: "Gemini is temporarily unavailable after a few retries. Please try again in a moment." };
      }
      if (!response) {
        return { answer: "The assistant could not reach Gemini. Check the server connection and try again." };
      }
      if (response.status === 401 || response.status === 403) {
        return { answer: `Gemini rejected the configured key or its permissions (HTTP ${response.status}). Use a newly rotated key with the Gemini API enabled.` };
      }
      if (response.status === 429) {
        return { answer: "Gemini quota is temporarily exhausted (HTTP 429). Check the project's API quota and billing, then try again." };
      }
      if (response.status === 404) {
        return { answer: "The configured Gemini model endpoint was not found (HTTP 404). The model name may need updating." };
      }
      return { answer: `Gemini returned HTTP ${response.status}. Check the configured model and try again.` };
    }

    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const answer = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return { answer: answer || "I couldn't find a grounded answer in the project data. Try asking about a study, KPI, SAE, compliance item, or export." };
  });
