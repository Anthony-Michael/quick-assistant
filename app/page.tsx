import Link from "next/link";

const ISSUES = [
  "printer",
  "wifi",
  "pos",
  "email-login",
  "computer",
] as const;

export default function Home() {
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
              A minimal, guided flow to help frontline staff talk through common
              IT issues before escalating to support.
            </p>
          </div>
        </header>

        <section aria-label="Available troubleshooting flows">
          <ul className="grid gap-4 sm:grid-cols-2">
            {ISSUES.map((slug) => {
              const label = slug.replace(/-/g, " ");
              const isPrinter = slug === "printer";

              return (
                <li key={slug}>
                  <Link
                    href={`/issue/${slug}`}
                    className="group block h-full rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                          {isPrinter && <span aria-hidden>🖨️</span>}
                          <span className="capitalize">{label}</span>
                        </p>
                        {isPrinter && (
                          <p className="mt-1 text-xs text-zinc-600">
                            Walk through basic printer checks before opening an
                            IT ticket.
                          </p>
                        )}
                      </div>
                      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400 group-hover:text-zinc-500">
                        Start
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
