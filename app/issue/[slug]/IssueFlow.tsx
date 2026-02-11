"use client";

import Link from "next/link";
import { useState } from "react";

export type IssueStep = {
  id: string;
  title: string;
  instructions: string[];
};

export type IssueData = {
  title: string;
  steps: IssueStep[];
  escalation_info?: string[];
};

type Props = {
  issue: IssueData;
  slug: string;
};

export default function IssueFlow({ issue, slug }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);

  const steps = issue.steps;
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === totalSteps - 1;
  const escalationInfo = issue.escalation_info ?? [];

  const handleNextStep = () => {
    if (isLastStep) {
      setShowEscalation(true);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleCopyEscalation = async () => {
    const text = escalationInfo.map((item) => `• ${item}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copy failed");
    }
  };

  const handleAskAssistant = async () => {
    const trimmed = assistantInput.trim();
    if (!trimmed || assistantLoading) return;
    setAssistantError(null);
    setAssistantResponse(null);
    setAssistantLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          question: trimmed,
          currentStepIndex,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssistantError((data as { error?: string }).error || "Something went wrong.");
        return;
      }
      setAssistantResponse((data as { answer?: string }).answer ?? "No response.");
      setAssistantInput("");
    } catch {
      setAssistantError("Network error. Please try again.");
    } finally {
      setAssistantLoading(false);
    }
  };

  if (resolved) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="mb-2 text-lg font-semibold text-green-800">
            Great — issue resolved!
          </p>
          <p className="mb-4 text-green-700">
            If the problem comes back, you can run through these steps again.
          </p>
          <Link
            href="/"
            className="inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Back to issues
          </Link>
        </div>
      </div>
    );
  }

  if (showEscalation) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Escalate to IT
        </h2>
        <p className="mb-4 text-zinc-600">
          When contacting support, have this information ready:
        </p>
        <ul className="mb-6 list-disc space-y-1 pl-6 text-zinc-700">
          {escalationInfo.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyEscalation}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Copy escalation info
          </button>
          {copyFeedback && (
            <span className="text-sm text-zinc-600">{copyFeedback}</span>
          )}
        </div>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to issues
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">{issue.title}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Step {currentStepIndex + 1} of {totalSteps}
      </p>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          {currentStep.title}
        </h2>
        <ul className="mb-6 list-disc space-y-1 pl-6 text-zinc-700">
          {currentStep.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setResolved(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Fixed
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Next step
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-800">
          Ask the assistant
        </h2>
        <textarea
          value={assistantInput}
          onChange={(e) => setAssistantInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAskAssistant();
            }
          }}
          placeholder="e.g. Printer still offline after restart"
          rows={2}
          className="mb-2 w-full resize-y rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          disabled={assistantLoading}
        />
        <button
          type="button"
          onClick={handleAskAssistant}
          disabled={assistantLoading || !assistantInput.trim()}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {assistantLoading ? "Sending…" : "Send"}
        </button>
        {assistantError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {assistantError}
          </p>
        )}
        {assistantResponse && (
          <div className="mt-3 rounded border border-zinc-200 bg-white p-3 text-sm text-zinc-700 whitespace-pre-wrap">
            {assistantResponse}
          </div>
        )}
      </div>

      <Link
        href="/"
        className="mt-6 inline-block text-sm text-zinc-600 hover:text-zinc-900"
      >
        ← Back to issues
      </Link>
    </div>
  );
}
