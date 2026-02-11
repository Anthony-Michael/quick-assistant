import issues from "@/app/kb/issues.json";
import IssueFlow from "./IssueFlow";
import type { IssueData } from "./IssueFlow";

type Props = {
  params: { slug: string };
};

export default function IssuePage({ params }: Props) {
  const { slug } = params;
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
