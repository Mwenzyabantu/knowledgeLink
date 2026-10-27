import { ExternalLink, RefreshCw, ChevronRight, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { ConnectMapSummary, ConnectResearchFinding, ConnectTopicContribution } from "@shared/schema";

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <span>{message}</span>
      {retry && (
        <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="Loading content" className="animate-pulse space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={`h-4 rounded bg-muted ${index === 0 ? "w-2/3" : index === rows - 1 ? "w-1/2" : "w-full"}`} />
      ))}
    </div>
  );
}

function Contribution({ item }: { item: ConnectTopicContribution }) {
  const learnerTopic = item.origin === "learner";
  return (
    <div className="rounded-lg border border-border/80 bg-background/75 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{item.topic}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${learnerTopic ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>
          {learnerTopic ? "Course topic" : "AI-inferred concept"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.role}</p>
    </div>
  );
}

export function ContributionList({ items }: { items: ConnectTopicContribution[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No topic connections were included in this section.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => <Contribution key={`${item.topic}-${item.origin}-${index}`} item={item} />)}
    </div>
  );
}

export function SourceCard({ finding }: { finding: ConnectResearchFinding }) {
  const retrievedDate = new Date(finding.retrievedAt);
  const retrievedLabel = Number.isNaN(retrievedDate.getTime())
    ? String(finding.retrievedAt)
    : retrievedDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return (
    <article className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900/70">{finding.sourceName}</p>
          <h3 className="mt-1 font-semibold leading-snug">{finding.title}</h3>
        </div>
        <a
          href={finding.sourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open source: ${finding.sourceName}, ${finding.title}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{finding.summary}</p>
      {finding.sourceExcerpt && (
        <blockquote className="mt-3 border-l-2 border-amber-700/40 pl-3 text-sm italic leading-relaxed text-foreground/80">
          “{finding.sourceExcerpt}”
        </blockquote>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span>Retrieved {retrievedLabel}</span>
        <a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-amber-900 underline decoration-amber-900/30 underline-offset-4 hover:decoration-amber-900">
          Visit source <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function MapCard({ map, onDelete }: { map: ConnectMapSummary; onDelete: (id: string) => void }) {
  const [, setLocation] = useLocation();
  return (
    <article className="group flex flex-col justify-between gap-4 rounded-xl border border-border/80 bg-card p-4 transition hover:border-amber-900/30 hover:shadow-sm sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => setLocation(`/connect-the-dots/${map.id}`)}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900/70">{map.course.program} · {map.course.career}</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{map.course.courseName}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {map.findingCount} {map.findingCount === 1 ? "source" : "sources"} · {map.researchRoundCount} research {map.researchRoundCount === 1 ? "round" : "rounds"}
        </p>
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLocation(`/connect-the-dots/${map.id}`)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
        >
          Reopen <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(map.id)}
          aria-label={`Delete map for ${map.course.courseName}`}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
