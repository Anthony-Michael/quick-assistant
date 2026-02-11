import issues from "@/app/kb/issues.json";
import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

type IssueStep = { id: string; title: string; instructions: string[] };
type IssueData = {
  title: string;
  steps: IssueStep[];
  escalation_info?: string[];
};

function buildSystemPrompt(issue: IssueData): string {
  const stepsText = issue.steps
    .map(
      (s) =>
        `- ${s.title}: ${s.instructions.map((i) => i).join(" ")}`
    )
    .join("\n");
  const escalation = (issue.escalation_info ?? []).join(", ");

  return `You are a helpful IT assistant for troubleshooting. Use ONLY the following issue knowledge. Do not use other knowledge.

Issue: ${issue.title}

Steps (only refer to these):
${stepsText}

Escalation info (when suggesting escalation): ${escalation}

Rules:
- Never ask for passwords, PINs, or other sensitive data.
- Reply with short, numbered steps when giving instructions.
- If you are unsure or the issue is beyond these steps, say "Escalate to IT" and briefly suggest what info to have ready (from the escalation list).
- Keep responses concise.`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Assistant is not configured." },
      { status: 500 }
    );
  }

  let body: { message?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { message, slug } = body;
  if (typeof message !== "string" || !message.trim() || typeof slug !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid message or slug." },
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

  const systemPrompt = buildSystemPrompt(issue);

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.trim() },
        ],
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg =
        (err as { error?: { message?: string } })?.error?.message || res.statusText;
      return NextResponse.json(
        { error: msg || "Assistant request failed." },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content =
      data.choices?.[0]?.message?.content?.trim() || "No response from assistant.";

    return NextResponse.json({ content });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network or server error.";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
