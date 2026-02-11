import issues from "@/app/kb/issues.json";
import IssueFlow from "./IssueFlow";
import type { IssueData } from "./IssueFlow";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;
  const issue = (issues as Record<string, IssueData>)[slug];

  if (!issue) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-zinc-600">Unknown issue.</p>
      </div>
    );
  }

  return <IssueFlow issue={issue} slug={slug} />;
}
