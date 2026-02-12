import issues from "@/app/kb/issues.json";
import OpenAI from "openai";
import { NextResponse } from "next/server";

// IssueData shape matches app/issue/[slug]/IssueFlow; consider a shared types file later.
type IssueStep = { id: string; title: string; instructions: string[] };
type IssueData = {
  title: string;
  steps: IssueStep[];
  do_not_attempt?: string[];
  escalation_info?: string[];
};

function buildSystemPrompt(
  issue: IssueData,
  options?: {
    currentStepIndex?: number;
    currentStepTitle?: string;
    attemptedStepTitles?: string[];
  }
): string {
  const stepsText = issue.steps
    .map((s) => `- ${s.title}\n  - ${s.instructions.join("\n  - ")}`)
    .join("\n");
  const doNotAttempt = (issue.do_not_attempt ?? []).join(", ");
  const escalation = (issue.escalation_info ?? []).join(", ");
  const stepContext =
    options?.currentStepTitle?.trim() ||
    (typeof options?.currentStepIndex === "number" && issue.steps[options.currentStepIndex]
      ? issue.steps[options.currentStepIndex].title
      : null);
  const stepContextLine = stepContext
    ? `The user is currently on step: "${stepContext}".`
    : "";

  const attemptedTitles = options?.attemptedStepTitles ?? [];
  const attemptedLine =
    attemptedTitles.length > 0
      ? `The user has already attempted these steps: ${attemptedTitles.join(
          ", "
        )}. Do not repeat them unless they ask.`
      : "The user has not confirmed completing any steps yet.";

  return `You are a helpful IT assistant. Use ONLY the following issue data. Do not use other knowledge.

Issue: ${issue.title}
${stepContextLine}
${attemptedLine}

Steps (only refer to these):
${stepsText}

Do NOT suggest or instruct the user to do any of the following (escalate instead): ${doNotAttempt}

When suggesting escalation, tell them what info to have ready: ${escalation}

Safety and format rules:
- Never ask for passwords, tokens, or other sensitive information.
- Never instruct risky actions: driver reinstalls, network setting changes, firmware updates, or admin-level commands. Say "Escalate to IT" and what info to provide instead.
- Use only the provided steps and issue data. Keep responses short, numbered, and practical.
- If you are unsure or the user has exhausted the steps, recommend escalation and list what info to provide (from the escalation list above).

Structured output (required): Reply with ONLY a valid JSON object. No markdown, no code fence, no other text. The object must have exactly these keys:
- "answer": string — your short, helpful answer (numbered steps when giving instructions).
- "recommendation": one of "next_step" (user should advance), "repeat_step" (try current step again or clarify), "escalate" (user should escalate to IT).
- "shouldEscalate": boolean — true if the user should contact IT, false otherwise.

Example: {"answer":"1. Check the power cable. 2. Restart the printer.","recommendation":"next_step","shouldEscalate":false}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Assistant is not configured." },
      { status: 500 }
    );
  }

  let body: {
    slug?: string;
    question?: string;
    currentStepIndex?: number;
    currentStepTitle?: string;
    attemptedStepIds?: string[];
    attemptedStepTitles?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const {
    slug,
    question,
    currentStepIndex,
    currentStepTitle,
    attemptedStepIds,
    attemptedStepTitles,
  } = body;
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid slug." },
      { status: 400 }
    );
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid question." },
      { status: 400 }
    );
  }

  const issue = (issues as Record<string, IssueData>)[slug];
  if (!issue) {
    return NextResponse.json(
      { error: "Unknown issue." },
      { status: 404 }
    );
  }

  const safeStepIndex =
    typeof currentStepIndex === "number" &&
    currentStepIndex >= 0 &&
    currentStepIndex < issue.steps.length
      ? currentStepIndex
      : undefined;

  const safeAttemptedTitles = Array.isArray(attemptedStepTitles)
    ? attemptedStepTitles.filter((t) => typeof t === "string").slice(0, 20)
    : [];

  const systemPrompt = buildSystemPrompt(issue, {
    currentStepIndex: safeStepIndex,
    currentStepTitle:
      typeof currentStepTitle === "string" ? currentStepTitle : undefined,
    attemptedStepTitles: safeAttemptedTitles,
  });

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question.trim() },
      ],
      max_tokens: 500,
    });

    const raw =
      completion.choices?.[0]?.message?.content?.trim() ||
      "";

    let answer = "No response from assistant.";
    let recommendation: "next_step" | "repeat_step" | "escalate" = "repeat_step";
    let shouldEscalate = false;

    try {
      const parsed = JSON.parse(raw) as {
        answer?: string;
        recommendation?: string;
        shouldEscalate?: boolean;
      };
      if (typeof parsed.answer === "string" && parsed.answer.trim()) {
        answer = parsed.answer.trim();
      }
      if (
        parsed.recommendation === "next_step" ||
        parsed.recommendation === "repeat_step" ||
        parsed.recommendation === "escalate"
      ) {
        recommendation = parsed.recommendation;
      }
      if (typeof parsed.shouldEscalate === "boolean") {
        shouldEscalate = parsed.shouldEscalate;
      }
    } catch {
      // If JSON parse fails, still return a valid shape; answer might be in raw
      if (raw.length > 0) answer = raw.slice(0, 1200);
    }

    return NextResponse.json({
      answer,
      recommendation,
      shouldEscalate,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed.";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
