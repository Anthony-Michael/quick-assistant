import issues from "@/app/kb/issues.json";
import OpenAI from "openai";
import { NextResponse } from "next/server";

type IssueStep = { id: string; title: string; instructions: string[] };
type IssueData = {
  title: string;
  steps: IssueStep[];
  do_not_attempt?: string[];
  escalation_info?: string[];
};

function buildSystemPrompt(issue: IssueData, currentStepIndex?: number): string {
  const stepsText = issue.steps
    .map(
      (s) =>
        `- ${s.title}: ${s.instructions.map((i) => i).join(" ")}`
    )
    .join("\n");
  const doNotAttempt = (issue.do_not_attempt ?? []).join(", ");
  const escalation = (issue.escalation_info ?? []).join(", ");
  const stepContext =
    typeof currentStepIndex === "number" && issue.steps[currentStepIndex]
      ? `The user is currently on step: "${issue.steps[currentStepIndex].title}".`
      : "";

  return `You are a helpful IT assistant. Use ONLY the following issue data. Do not use other knowledge.

Issue: ${issue.title}
${stepContext}

Steps (only refer to these):
${stepsText}

Do NOT suggest or instruct the user to do any of the following (escalate instead): ${doNotAttempt}

When suggesting escalation, tell them what info to have ready: ${escalation}

Safety and format rules:
- Never ask for passwords, tokens, or other sensitive information.
- Never instruct risky actions: driver reinstalls, network setting changes, firmware updates, or admin-level commands. Say "Escalate to IT" and what info to provide instead.
- Use only the provided steps and issue data. Keep responses short, numbered, and practical.
- If you are unsure or the user has exhausted the steps, recommend escalation and list what info to provide (from the escalation list above).`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Assistant is not configured." },
      { status: 500 }
    );
  }

  let body: { slug?: string; question?: string; currentStepIndex?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { slug, question, currentStepIndex } = body;
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

  const systemPrompt = buildSystemPrompt(
    issue,
    typeof currentStepIndex === "number" ? currentStepIndex : undefined
  );

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

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No response from assistant.";

    return NextResponse.json({ answer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed.";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
