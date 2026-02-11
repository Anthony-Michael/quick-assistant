import Link from "next/link";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to issues
        </Link>
        <h1 className="text-3xl font-semibold text-zinc-900 capitalize">
          {slug.replace(/-/g, " ")}
        </h1>
      </div>
    </div>
  );
}
