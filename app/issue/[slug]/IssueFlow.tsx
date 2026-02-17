"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Add missing type for ChatApiResponse
type ChatApiResponse = {
  answer?: string;
  recommendation?: "next_step" | "repeat_step" | "escalate";
  shouldEscalate?: boolean;
  error?: string;
};

// Demo IT escalation defaults (mock data for demo video)
const IT_SUPPORT_EMAIL = "it-support@quickfixdemo.com";
const DEMO_STORE_NUMBER = "Store 042";
const DEMO_LOCATION = "Port Coquitlam - Shaughnessy St";

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

export type AssistantResponse = {
  answer: string;
  recommendation: "next_step" | "repeat_step" | "escalate";
  shouldEscalate: boolean;
};

type Props = {
  issue: IssueData;
  slug: string;
};

export default function IssueFlow({ issue, slug }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [attemptedStepIds, setAttemptedStepIds] = useState<string[]>([]);
  const [attemptedStepTitles, setAttemptedStepTitles] = useState<string[]>([]);
  const [escalationDetails, setEscalationDetails] = useState({
    storeNumber: DEMO_STORE_NUMBER,
    location: DEMO_LOCATION,
    deviceName: "",
    errorMessage: "",
    stepsAttempted: "",
    deviceUsed: "",
    issueStarted: "",
    othersAffected: "",
    additionalInfo: "",
  });

  const steps = issue.steps;
  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === totalSteps - 1;
  const attemptedTitlesClean = useMemo(
    () =>
      Array.from(
        new Set(
          (attemptedStepTitles ?? []).filter(
            (title) => typeof title === "string" && title.trim().length > 0
          )
        )
      ),
    [attemptedStepTitles]
  );

  if (!currentStep) {
  return (
    <div className="relative mx-auto min-h-screen max-w-3xl space-y-8 bg-zinc-50 p-6">
      <h1 className="text-3xl font-bold text-zinc-900">{issue.title}</h1>
      <p className="text-sm text-zinc-600">
        No steps found or the current step index is invalid.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        ← Back to issues
      </Link>
    </div>
  );
}

  const stepsAttemptedCsv = attemptedTitlesClean.join(", ");

  function markCurrentStepAttempted(): void {
  // Safety guard so TS doesn't complain about possibly undefined currentStep
  if (!currentStep) return;

  setAttemptedStepIds((prev) => {
    if (!prev.includes(currentStep.id)) return [...prev, currentStep.id];
    return prev;
  });

  setAttemptedStepTitles((prev) => {
    if (!prev.includes(currentStep.title)) return [...prev, currentStep.title];
    return prev;
  });
}

  function showToast(message: string): void {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }

  async function handleCopyEscalation(): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatEscalationInfo());
      showToast("Escalation info copied to clipboard!");
    } catch {
      showToast("Failed to copy escalation info.");
    }
  }

  function formatEscalationInfo(): string {
    const stepsAttemptedFormatted = escalationDetails.stepsAttempted
      ? escalationDetails.stepsAttempted
          .split(",")
          .map((step) => `- ${step.trim()}`)
          .join("\n")
      : "Not provided";

    return (
      `Issue: ${issue.title}\n` +
      `Store: ${escalationDetails.storeNumber || "Not provided"}\n` +
      `Location: ${escalationDetails.location || "Not provided"}\n` +
      `Device/Location: ${escalationDetails.deviceName || "Not provided"}\n` +
      `Error Message: ${escalationDetails.errorMessage || "Not provided"}\n` +
      `Steps Attempted:\n${stepsAttemptedFormatted}\n` +
      `Device Used: ${escalationDetails.deviceUsed || "Not provided"}\n` +
      `Started: ${escalationDetails.issueStarted || "Not provided"}\n` +
      `Others Affected: ${escalationDetails.othersAffected || "Not provided"}\n` +
      `Additional Info: ${escalationDetails.additionalInfo || "None"}`
    );
  }

    const goToEscalation = (
    markAttempted = true,
    stepsAttemptedOverride?: string
  ) => {
    if (markAttempted) {
      markCurrentStepAttempted();
    }
    setShowEscalation(true);
    setEscalationDetails((prev) => ({
      ...prev,
      stepsAttempted:
        prev.stepsAttempted || stepsAttemptedOverride || stepsAttemptedCsv,
    }));
  };

  const handleNextStep = () => {
    markCurrentStepAttempted();

    setAssistantResponse(null);
    setAssistantError(null);

    if (isLastStep) {
      goToEscalation(false);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleAskAssistant = async () => {
    const trimmedInput = assistantInput.trim();
    if (!trimmedInput || assistantLoading) return;
    const step = currentStep;
    if (!step) return;

    const nextAttemptedIds = attemptedStepIds.includes(step.id)
      ? attemptedStepIds
      : [...attemptedStepIds, step.id];
    const nextAttemptedTitles = attemptedStepTitles.includes(step.title)
      ? attemptedStepTitles
      : [...attemptedStepTitles, step.title];
    setAttemptedStepIds(nextAttemptedIds);
    setAttemptedStepTitles(nextAttemptedTitles);

    setAssistantLoading(true);
    setAssistantError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          question: trimmedInput,
          currentStepIndex,
          currentStepTitle: step.title,
          attemptedStepIds: nextAttemptedIds,
          attemptedStepTitles: nextAttemptedTitles,
        }),
      });

      const data: ChatApiResponse = await response.json();

      if (!response.ok) {
        setAssistantError(data.error || "Failed to fetch assistant response.");
        return;
      }

      setAssistantResponse({
        answer: data.answer ?? "No response.",
        recommendation: data.recommendation ?? "repeat_step",
        shouldEscalate: Boolean(data.shouldEscalate),
      });

      if (data.shouldEscalate) {
        goToEscalation(false, nextAttemptedTitles.join(", "));
      }

      setAssistantInput("");
    } catch {
      setAssistantError("Something went wrong. Please try again.");
    } finally {
      setAssistantLoading(false);
    }
  };

  const openGmailDraft = () => {
    const subject = encodeURIComponent(
      `IT Escalation: ${issue.title} - ${escalationDetails.deviceName || "Unknown device"} - ${escalationDetails.storeNumber || "Unknown store"}`
    );
    const body = encodeURIComponent(formatEscalationInfo());
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${IT_SUPPORT_EMAIL}&su=${subject}&body=${body}`;

    const newTab = window.open(gmailUrl, "_blank", "noopener,noreferrer");
    if (!newTab) {
      showToast("Popup blocked. Please allow popups and try again.");
    } else {
      showToast("Opening Gmail draft…");
    }
  };
  

  if (resolved) {
    return (
      <div className="relative mx-auto min-h-screen max-w-3xl bg-zinc-50 p-4 sm:p-6">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-green-800">
            Issue resolved
          </h1>
          <p className="mt-2 text-sm text-green-700">
            Nice work. The troubleshooting flow is complete for this issue.
          </p>
        </div>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
        >
          ← Back to issues
        </Link>
      </div>
    );
  }


  if (showEscalation) {
    return (
      <div className="mx-auto min-h-screen max-w-3xl bg-zinc-50 p-4 sm:p-6">
        <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Escalation form
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Fill out the details below so IT gets a clear, actionable summary.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-sm font-medium text-zinc-700">
              <strong className="text-zinc-900">Store number:</strong>{" "}
              {escalationDetails.storeNumber}
            </p>
            <p className="text-sm font-medium text-zinc-700">
              <strong className="text-zinc-900">Location:</strong>{" "}
              {escalationDetails.location}
            </p>
          </div>
          <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Device Name</label>
            <input
              type="text"
              value={escalationDetails.deviceName}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, deviceName: e.target.value })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Error Message</label>
            <input
              type="text"
              value={escalationDetails.errorMessage}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, errorMessage: e.target.value })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Issue Started</label>
            <input
              type="text"
              value={escalationDetails.issueStarted}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, issueStarted: e.target.value })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Device Used</label>
            <input
              type="text"
              value={escalationDetails.deviceUsed}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, deviceUsed: e.target.value })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Steps Attempted</label>
            <textarea
              value={escalationDetails.stepsAttempted}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, stepsAttempted: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Others Affected</label>
            <input
              type="text"
              value={escalationDetails.othersAffected}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, othersAffected: e.target.value })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">Additional Info</label>
            <textarea
              value={escalationDetails.additionalInfo}
              onChange={(e) => setEscalationDetails({ ...escalationDetails, additionalInfo: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyEscalation}
              disabled={!escalationDetails.deviceName && !escalationDetails.errorMessage}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy Escalation Info
            </button>
            <button
              type="button"
              onClick={openGmailDraft}
              disabled={!escalationDetails.deviceName && !escalationDetails.errorMessage}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open Email Draft
            </button>
          </div>
          <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Escalation preview
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700">
              {formatEscalationInfo()}
            </pre>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="relative mx-auto min-h-screen max-w-3xl space-y-8 bg-zinc-50 p-4 sm:p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed right-4 top-4 z-50 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900">
        {issue.title}
      </h1>
      <p className="text-sm font-medium text-zinc-600">
        Step {currentStepIndex + 1} of {totalSteps}
      </p>
      {attemptedTitlesClean.length > 0 && (
        <p className="mb-6 text-sm text-zinc-700">
          <span className="font-semibold text-zinc-800">Attempted:</span>{" "}
          {attemptedTitlesClean.join(", ")}
        </p>
      )}

      <div className="mt-4 space-y-4 rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-md">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold uppercase tracking-wide text-zinc-700">
            Current step
          </h2>
          <p className="text-sm font-medium text-zinc-500">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
        </div>
        <h3 className="text-2xl font-bold text-zinc-900">
          {currentStep.title}
        </h3>
        <ul className="list-disc space-y-2 pl-6 text-zinc-700">
          {currentStep.instructions.map((inst: string, i: number) => (
            <li key={i}>{inst}</li>
          ))}
        </ul>

        <div className="flex flex-col md:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              markCurrentStepAttempted();
              setResolved(true);
            }}
            className="flex-1 md:flex-none rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Fixed
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            className="flex-1 md:flex-none rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
          >
            Next step
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 shadow-md">
        <h2 className="text-lg font-semibold text-zinc-900">
          Ask the assistant
        </h2>
        <p className="text-sm text-zinc-600">
          Describe what you see, and the assistant will suggest a next check or escalation.
        </p>
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
          rows={3}
          className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
          disabled={assistantLoading}
        />
        <button
          type="button"
          onClick={handleAskAssistant}
          disabled={assistantLoading || !assistantInput.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {assistantLoading ? "Sending…" : "Send"}
        </button>
        {assistantError && (
          <p className="text-sm text-red-600" role="alert">
            {assistantError}
          </p>
        )}
        {assistantResponse && (
          <>
            <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800 shadow-sm">
              {assistantResponse.answer}
            </div>
            {assistantResponse.shouldEscalate && (
              <button
                type="button"
                onClick={() => setShowEscalation(true)}
                className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Escalate to IT
              </button>
            )}
          </>
        )}
      </div>

      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-zinc-700 hover:text-zinc-900"
      >
        ← Back to issues
      </Link>
    </div>
  );
}