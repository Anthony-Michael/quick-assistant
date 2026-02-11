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
    <div className="min-h-screen bg-zinc-50 p-8">
      <main className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-2xl font-semibold text-zinc-900">
          QuickFix Assistant
        </h1>
        <ul className="grid gap-4 sm:grid-cols-2">
          {ISSUES.map((slug) => (
            <li key={slug}>
              <Link
                href={`/issue/${slug}`}
                className="block rounded-lg border border-zinc-200 bg-white px-6 py-4 text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <span className="font-medium capitalize">
                  {slug.replace(/-/g, " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
