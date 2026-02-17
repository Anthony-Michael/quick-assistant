"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import issues from "@/app/kb/issues.json";

type IssueEntry = {
  title?: string;
  description?: string;
};

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const issueMap = issues as Record<string, IssueEntry>;
  const entries = useMemo(
    () =>
      Object.entries(issueMap).map(([slug, issue]) => ({
        slug,
        title: issue.title ?? slug.replace(/-/g, " "),
        description: issue.description ?? "Troubleshooting flow",
      })),
    [issueMap]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) return entries;
    return entries.filter((entry) => {
      const haystack = `${entry.slug} ${entry.title} ${entry.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [entries, normalizedQuery]);

  const topMatch = filteredEntries[0];

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10">
      <main className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Prototype
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
              QuickFix Assistant
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-600">
              Search for an issue, then jump into the matching troubleshooting flow.
            </p>
          </div>
        </header>

        <section
          aria-label="Search troubleshooting flows"
          className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <label
            htmlFor="issue-search"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Search issues
          </label>
          <input
            id="issue-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && topMatch) {
                router.push(`/issue/${topMatch.slug}`);
              }
            }}
            placeholder="Try: printer"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Press Enter to open the top result.
          </p>

          <ul className="mt-4 space-y-2">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/issue/${entry.slug}`}
                    className="block rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30"
                  >
                    <p className="font-medium text-zinc-900">{entry.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{entry.description}</p>
                  </Link>
                </li>
              ))
            ) : (
              <li className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                No matching flow found.
              </li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
