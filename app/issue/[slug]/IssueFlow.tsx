"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

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
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] =
    useState<AssistantResponse | null>(null);

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

  useEffect(() => {
    // Prefill stepsAttempted only if showEscalation is true and stepsAttempted is empty
    if (showEscalation) {
      setEscalationDetails((prev) => {
        if (!prev.stepsAttempted) {
          return {
            ...prev,
            stepsAttempted: attemptedTitlesClean.join(", ") || "Not provided",
          };
        }
        return prev;
      });
    }
  }, [showEscalation, attemptedTitlesClean]);

  const markCurrentStepAttempted = () => {
    if (!currentStep) return; // Defensive guard for undefined/null currentStep

    setAttemptedStepIds((prev) => (prev.includes(currentStep.id) ? prev : [...prev, currentStep.id]));
    setAttemptedStepTitles((prev) => (prev.includes(currentStep.title) ? prev : [...prev, currentStep.title]));
  };

  const handleNextStep = () => {
    markCurrentStepAttempted();

    setAssistantResponse(null);
    setAssistantError(null);

    if (isLastStep) {
      setShowEscalation(true);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  // Helper function to format escalation details into a ticket-style block
  const formatEscalationInfo = () => {
    const stepsAttemptedFormatted = escalationDetails.stepsAttempted
      ? escalationDetails.stepsAttempted.split(",").map((step) => `- ${step.trim()}`).join("\n")
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
      `Others Affected: ${escalationDetails.othersAffected || "Not provided"}`
    );
  };

  const handleCopyEscalation = async () => {
    const text = formatEscalationInfo();
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copy failed. Please try again.");
    }
  };

  const IT_SUPPORT_EMAIL = "it-support@quickfixdemo.com";
  const DEMO_STORE_NUMBER = "Store 042";
  const DEMO_LOCATION = "Port Coquitlam - Shaughnessy St";

  const openGmailDraft = () => {
    // Construct the Gmail compose URL with recipient, subject, and body
    const subject = encodeURIComponent(
      `IT Escalation: ${issue.title} - ${escalationDetails.deviceName || "Unknown device"} - ${escalationDetails.storeNumber || "Unknown store"}`
    );
    const body = encodeURIComponent(formatEscalationInfo());
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${IT_SUPPORT_EMAIL}&su=${subject}&body=${body}`;

    // Open Gmail compose in a new tab with a fallback for popup blockers
    const newTab = window.open(gmailUrl, "_blank", "noopener,noreferrer");
    if (!newTab) {
      window.location.href = gmailUrl; // Fallback if popup is blocked
    }
  };

  const handleAskAssistant = async () => {
    const trimmed = assistantInput.trim();
    if (!trimmed || assistantLoading) return;

    const step = currentStep;
    if (!step) {
      return;
    }
    const nextAttemptedIds = attemptedStepIds.includes(step.id)
      ? attemptedStepIds
      : [...attemptedStepIds, step.id];
    const nextAttemptedTitles = attemptedStepTitles.includes(step.title)
      ? attemptedStepTitles
      : [...attemptedStepTitles, step.title];

    setAttemptedStepIds(nextAttemptedIds);
    setAttemptedStepTitles(nextAttemptedTitles);

    setAssistantError(null);
    setAssistantLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          question: trimmed,
          currentStepIndex,
          currentStepTitle: step.title,
          attemptedStepIds: nextAttemptedIds,
          attemptedStepTitles: nextAttemptedTitles,
        }),
      });
      let data: ChatApiResponse = {}; // Use the new type
      try {
        data = (await res.json()) as ChatApiResponse; // Parse JSON with the type
      } catch {}
      if (!res.ok) {
        setAssistantError(data.error || "Something went wrong.");
        return;
      }
      setAssistantResponse({
        answer: data.answer ?? "No response.",
        recommendation: data.recommendation ?? "repeat_step",
        shouldEscalate: Boolean(data.shouldEscalate),
      });
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
        <div className="rounded-lg border bg-white shadow-sm p-6">
          <h2 className="mb-2 text-xl font-semibold text-zinc-900">
            Escalate to IT
          </h2>
          <p className="mb-6 text-sm text-zinc-600">
            Provide the following details to help IT support resolve your issue quickly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="deviceName" className="block text-sm font-medium text-zinc-800">
                Printer / Device Name or Location
              </label>
              <input
                type="text"
                id="deviceName"
                name="deviceName"
                value={escalationDetails.deviceName}
                onChange={(e) =>
                  setEscalationDetails({ ...escalationDetails, deviceName: e.target.value })
                }
                placeholder="e.g., Front counter printer"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="errorMessage" className="block text-sm font-medium text-zinc-800">
                Exact Error Message
              </label>
              <input
                type="text"
                id="errorMessage"
                name="errorMessage"
                value={escalationDetails.errorMessage}
                onChange={(e) =>
                  setEscalationDetails({ ...escalationDetails, errorMessage: e.target.value })
                }
                placeholder="Copy exactly what you see"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="issueStarted" className="block text-sm font-medium text-zinc-800">
                When Did the Issue Start?
              </label>
              <input
                type="text"
                id="issueStarted"
                name="issueStarted"
                value={escalationDetails.issueStarted}
                onChange={(e) =>
                  setEscalationDetails({ ...escalationDetails, issueStarted: e.target.value })
                }
                placeholder="e.g., Today 2:15pm"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="deviceUsed" className="block text-sm font-medium text-zinc-800">
                Device Used (POS, Laptop, Desktop, etc.)
              </label>
              <input
                type="text"
                id="deviceUsed"
                name="deviceUsed"
                value={escalationDetails.deviceUsed}
                onChange={(e) =>
                  setEscalationDetails({ ...escalationDetails, deviceUsed: e.target.value })
                }
                placeholder="e.g., POS system"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="stepsAttempted" className="block text-sm font-medium text-zinc-800">
                What Troubleshooting Steps Were Attempted
              </label>
              <textarea
                id="stepsAttempted"
                name="stepsAttempted"
                value={escalationDetails.stepsAttempted}
                onChange={(e) =>
                  setEscalationDetails({ ...escalationDetails, stepsAttempted: e.target.value })
                }
                rows={3}
                placeholder="Describe the steps you tried"
                className="mt-1 block w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="othersAffected" className="block text-sm font-medium text-zinc-800">
                Are Others Affected?
              </label>
              <input
                type="text"
                id="othersAffected"
                name="othersAffected"
                value={escalationDetails.othersAffected}
                onChange={(e) =>
                  setEscalationDetails({ ...escalationDetails, othersAffected: e.target.value })
                }
                placeholder="e.g., Everyone at this location"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={handleCopyEscalation}
              disabled={!escalationDetails.deviceName && !escalationDetails.errorMessage}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {copyFeedback === "Copied!" ? "Copied" : "Copy escalation info"}
            </button>
            {copyFeedback && copyFeedback !== "Copied!" && (
              <span className="text-sm text-red-600">{copyFeedback}</span>
            )}
            <a
              onClick={openGmailDraft}
              className={`rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 ${
                !escalationDetails.deviceName && !escalationDetails.errorMessage
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              Open email draft
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">
        {issue.title}
      </h1>
      <p className="text-sm text-zinc-500">
        Step {currentStepIndex + 1} of {totalSteps}
      </p>
      {attemptedTitlesClean.length > 0 && (
        <p className="mb-6 text-xs text-zinc-600">
          <span className="font-medium text-zinc-700">Attempted:</span>{" "}
          {attemptedTitlesClean.join(", ")}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wide text-zinc-600">
          Current step
        </h2>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          {currentStep.title}
        </h3>
        <ul className="mb-6 list-disc space-y-1 pl-6 text-zinc-700">
          {currentStep.instructions.map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              markCurrentStepAttempted();
              setResolved(true);
            }}
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

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Ask the assistant
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Describe what you see, and the assistant will suggest a next check or
          escalation.
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
          rows={2}
          className="mb-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          disabled={assistantLoading}
        />
        <button
          type="button"
          onClick={handleAskAssistant}
          disabled={assistantLoading || !assistantInput.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {assistantLoading ? "Sending…" : "Send"}
        </button>
        {assistantError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {assistantError}
          </p>
        )}
        {assistantResponse && (
          <>
            <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
              {assistantResponse.answer}
            </div>
            {assistantResponse.shouldEscalate && (
              <button
                type="button"
                onClick={() => setShowEscalation(true)}
                className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Escalate to IT
              </button>
            )}
            {assistantResponse.recommendation === "next_step" && (
              <button
                type="button"
                onClick={handleNextStep}
                className="mt-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Go to next step
              </button>
            )}
          </>
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
