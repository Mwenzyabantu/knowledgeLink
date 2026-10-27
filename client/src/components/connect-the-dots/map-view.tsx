import { useMemo, useState } from "react";
import { useMutation, type QueryClient, type UseMutationResult } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Waypoints,
} from "lucide-react";
import type {
  ConnectApplication,
  ConnectMapDetail,
  ConnectResearchFinding,
} from "@shared/schema";
import { ContributionList, ErrorNotice, SkeletonBlock, SourceCard } from "./common";
import { MAPS_KEY, mapKey, readJson } from "./api";

type MapViewProps = {
  mapId: string;
  map?: ConnectMapDetail;
  isLoading: boolean;
  isError: boolean;
  error: string;
  retry: () => void;
  initialAssessmentError?: string | null;
  deleteMap: UseMutationResult<{ ok: true }, Error, string, unknown>;
  queryClient: QueryClient;
};

type GeminiKeyTestReport = {
  model: string;
  results: Array<{
    keyName: string;
    status: string;
    httpStatus?: number;
    providerStatus?: string;
  }>;
};

const keyTestStatusLabels: Record<string, string> = {
  working: "Working",
  invalid_key: "Invalid key",
  quota_exhausted: "Quota exhausted",
  access_denied: "Access denied",
  model_unavailable: "Model unavailable",
  request_failed: "Request rejected",
  timeout: "Timed out",
  network_error: "Network error",
  not_configured: "Not configured",
};

export function MapView({
  mapId,
  map,
  isLoading,
  isError,
  error,
  retry,
  initialAssessmentError = null,
  deleteMap,
  queryClient,
}: MapViewProps) {
  const [, setLocation] = useLocation();
  const [knownUseDraft, setKnownUseDraft] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [assessmentErrorOverride, setAssessmentErrorOverride] = useState<string | null>(null);
  const assessmentError = assessmentErrorOverride ?? initialAssessmentError;

  const patchMap = (updated: ConnectMapDetail) => {
    queryClient.setQueryData(mapKey(updated.id), updated);
    void queryClient.invalidateQueries({ queryKey: MAPS_KEY });
  };
  const overviewMutation = useMutation({
    mutationFn: () => readJson<ConnectMapDetail>("POST", `/api/connect-the-dots/maps/${mapId}/overview`),
    onSuccess: patchMap,
    onError: (err) => setActionError(String(err)),
  });
  const keyTestMutation = useMutation({
    mutationFn: () => readJson<GeminiKeyTestReport>("POST", "/api/connect-the-dots/test-gemini-keys"),
    onError: (err) => setActionError(String(err)),
  });
  const assessmentMutation = useMutation({
    mutationFn: (description: string) => readJson<ConnectMapDetail>("POST", `/api/connect-the-dots/maps/${mapId}/use-assessment`, { description }),
    onSuccess: (updated) => {
      setAssessmentErrorOverride("");
      patchMap(updated);
    },
    onError: (err) => setAssessmentErrorOverride(String(err)),
  });
  const applicationMutation = useMutation({
    mutationFn: (applicationId: string) => readJson<ConnectMapDetail>("POST", `/api/connect-the-dots/maps/${mapId}/application`, { applicationId }),
    onSuccess: patchMap,
    onError: (err) => setActionError(String(err)),
  });
  const researchMutation = useMutation({
    mutationFn: (query: string) => readJson<{ map: ConnectMapDetail; addedFindings: ConnectResearchFinding[]; duplicateCount: number }>(
      "POST",
      `/api/connect-the-dots/maps/${mapId}/research`,
      query.trim() ? { query: query.trim() } : {},
    ),
    onSuccess: (result) => patchMap(result.map),
    onError: (err) => setActionError(String(err)),
  });

  const applications = useMemo(() => {
    const all = [...(map?.overview?.applications ?? []), ...(map?.useAssessment?.applications ?? [])];
    return all.filter((application, index) => all.findIndex((candidate) => candidate.id === application.id) === index);
  }, [map?.overview?.applications, map?.useAssessment?.applications]);
  const selectedApplication = map?.selectedApplication;
  const isWorking = overviewMutation.isPending || keyTestMutation.isPending || assessmentMutation.isPending || applicationMutation.isPending || researchMutation.isPending;
  const runAssessment = () => {
    const description = (knownUseDraft || map?.knownUse || "").trim();
    if (!description) return;
    setActionError("");
    setAssessmentErrorOverride("");
    assessmentMutation.mutate(description);
  };

  if (isLoading) {
    return <div className="mx-auto w-full max-w-5xl space-y-6" aria-label="Loading learning map"><div className="h-28 animate-pulse rounded-2xl bg-muted" /><div className="rounded-2xl border border-border bg-card p-6"><SkeletonBlock rows={5} /></div><div className="rounded-2xl border border-border bg-card p-6"><SkeletonBlock rows={3} /></div></div>;
  }
  if (isError || !map) {
    return <div className="mx-auto w-full max-w-4xl space-y-4"><button type="button" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign("/connect-the-dots")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to maps</button><ErrorNotice message={error} retry={retry} /></div>;
  }

  const courseTopics = map.course.topics ?? [];
  const contributions = map.biggerPicture?.topicContributions ?? map.useAssessment?.relevantConcepts ?? map.overview?.systems.flatMap((system) => system.topicContributions) ?? [];
  const uniqueContributions = contributions.filter((item, index) => contributions.findIndex((candidate) => candidate.topic === item.topic && candidate.origin === item.origin) === index);

  return (
    <div className="mx-auto w-full max-w-5xl pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setLocation("/connect-the-dots")} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All maps
        </button>
        <button
          type="button"
          onClick={() => { if (window.confirm("Delete this saved learning map? This cannot be undone.")) deleteMap.mutate(map.id); }}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete map
        </button>
      </div>
      {(deleteMap.error || actionError) && <div className="mb-4"><ErrorNotice message={actionError || `The map could not be deleted. ${String(deleteMap.error)}`} /></div>}

      <header className="mb-6 rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-orange-50/70 to-emerald-50/60 p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/75">{map.course.program} · {map.course.career}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{map.course.courseName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Started from {map.entryPath === "known_use" ? "a real-world use" : "course topics"} · Saved {new Date(map.createdAt).toLocaleDateString()}
        </p>
        {map.knownUse && <div className="mt-4 rounded-xl border border-amber-900/10 bg-background/70 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">Your starting observation</p><p className="mt-1 text-sm leading-relaxed">{map.knownUse}</p></div>}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-950/70">Your course topics</p>
          {courseTopics.length ? (
            <div className="flex flex-wrap gap-2">{courseTopics.map((topic) => <span key={topic.id} className="rounded-full border border-emerald-900/15 bg-emerald-100/80 px-3 py-1.5 text-xs font-medium text-emerald-950">{topic.topic}</span>)}</div>
          ) : <p className="text-sm text-muted-foreground">No course topics saved with this map.</p>}
        </div>
      </header>

      {map.entryPath === "known_use" && (
        <section className="mb-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="assessment-heading">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-950"><Search className="h-4 w-4" aria-hidden="true" /></span>
            <div className="flex-1">
              <h2 id="assessment-heading" className="text-lg font-semibold">Compare your observation with the course</h2>
              <p className="mt-1 text-sm text-muted-foreground">Assess how your known use relates to the course topics and where the connection may lead.</p>
            </div>
          </div>
          <label className="mt-4 block space-y-1.5 text-sm">
            <span className="font-medium">Use to assess</span>
            <textarea value={knownUseDraft || map.knownUse || ""} onChange={(event) => setKnownUseDraft(event.target.value)} rows={3} maxLength={1000} disabled={assessmentMutation.isPending} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-800/60 disabled:opacity-60" />
          </label>
          {assessmentError && !map.useAssessment && (
            <div className="mt-4"><ErrorNotice message={`We couldn't assess this use. ${assessmentError}`} /></div>
          )}
          <button type="button" onClick={runAssessment} disabled={isWorking || !(knownUseDraft || map.knownUse || "").trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-900/30 px-3.5 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800">
            {assessmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {assessmentMutation.isPending ? "Assessing…" : map.useAssessment ? "Refresh comparison" : assessmentError ? "Retry assessment" : "Compare with course"}
          </button>
          {map.useAssessment && (
            <div className="mt-5 rounded-xl bg-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Connection strength</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold capitalize text-amber-950">{map.useAssessment.fitLevel}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{map.useAssessment.reasoning}</p>
              <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related course topics and inferred concepts</p><ContributionList items={map.useAssessment.relevantConcepts} /></div>
            </div>
          )}
        </section>
      )}

      <section className="mb-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="overview-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70">01 · The system around you</p>
            <h2 id="overview-heading" className="mt-1 text-xl font-semibold tracking-tight">Course ideas in the wild</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setActionError(""); keyTestMutation.mutate(); }}
              disabled={isWorking}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-900/30 px-3.5 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
            >
              {keyTestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
              {keyTestMutation.isPending ? "Testing keys…" : "Test Gemini API keys"}
            </button>
            {!map.overview && (
              <button type="button" onClick={() => { setActionError(""); overviewMutation.mutate(); }} disabled={isWorking} className="inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3.5 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2">
                {overviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Waypoints className="h-4 w-4" aria-hidden="true" />}
                {overviewMutation.isPending ? "Building system overview…" : "Build system overview"}
              </button>
            )}
          </div>
        </div>
        {keyTestMutation.data && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Tested model: {keyTestMutation.data.model}</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {keyTestMutation.data.results.map((result) => (
                <li key={result.keyName} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{result.keyName}</span>
                  <span className={result.status === "working" ? "font-medium text-emerald-700" : "font-medium text-rose-700"}>
                    {keyTestStatusLabels[result.status] ?? result.status}
                    {result.httpStatus ? ` · HTTP ${result.httpStatus}` : ""}
                    {result.providerStatus ? ` · ${result.providerStatus}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {map.overview ? (
          <div className="mt-5">
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{map.overview.summary}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {map.overview.systems.map((system, index) => (
                <article key={`${system.title}-${index}`} className="rounded-xl border border-border/80 bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">System {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 font-semibold">{system.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{system.summary}</p>
                  {system.topicContributions.length > 0 && <div className="mt-3"><ContributionList items={system.topicContributions} /></div>}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 p-5">
            <p className="text-sm text-muted-foreground">Build an overview to see where your course topics show up in connected real-world systems.</p>
          </div>
        )}
      </section>

      <section className="mb-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="applications-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70">02 · Make it concrete</p>
        <h2 id="applications-heading" className="mt-1 text-xl font-semibold tracking-tight">Choose a career application</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select an application to build a Bigger Picture that follows the system from end to end.</p>
        {applications.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                selected={selectedApplication?.id === application.id}
                busy={isWorking}
                onSelect={() => { setActionError(""); applicationMutation.mutate(application.id); }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-5">
            <p className="text-sm text-muted-foreground">{map.entryPath === "known_use" && !map.useAssessment ? "Compare your known use with the course first to see relevant applications." : "Build the system overview to discover applications connected to this course."}</p>
          </div>
        )}
      </section>

      {map.biggerPicture && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-emerald-900/15 bg-emerald-50/50 p-5 sm:p-6" aria-labelledby="bigger-picture-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-950/70">03 · Zoom out</p>
          <h2 id="bigger-picture-heading" className="mt-1 text-xl font-semibold tracking-tight">{map.biggerPicture.title || "The Bigger Picture"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{map.biggerPicture.overview}</p>
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-950/70">Concepts contributing to the system</p>
            <ContributionList items={map.biggerPicture.topicContributions} />
          </div>
          {map.biggerPicture.systemFlow.length > 0 && (
            <ol className="mt-6 space-y-3">
              {map.biggerPicture.systemFlow.map((step, index) => (
                <li key={`${step.step}-${step.title}`} className="relative flex gap-3">
                  {index < map.biggerPicture!.systemFlow.length - 1 && <span className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-emerald-900/20" aria-hidden="true" />}
                  <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-900/20 bg-emerald-100 text-xs font-semibold text-emerald-950">{String(step.step).padStart(2, "0")}</span>
                  <div className="flex-1 rounded-xl border border-emerald-900/10 bg-background/80 p-4">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    {!!step.topics.length && <div className="mt-3 flex flex-wrap gap-1.5">{step.topics.map((topic) => {
                      const origin = map.biggerPicture?.topicContributions.find((item) => item.topic.toLowerCase() === topic.toLowerCase())?.origin;
                      return <span key={topic} className={`rounded-full px-2.5 py-1 text-xs ${origin === "learner" ? "bg-emerald-100 text-emerald-950" : "bg-amber-100 text-amber-950"}`}>{topic}<span className="ml-1.5 text-[10px] font-semibold uppercase">{origin === "learner" ? "course topic" : "AI-inferred"}</span></span>;
                    })}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5 rounded-xl border border-emerald-900/10 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-950/70">End-to-end example</p>
            <h3 className="mt-1 font-semibold">{map.biggerPicture.endToEndExample.title}</h3>
            <ol className="mt-3 space-y-2">
              {map.biggerPicture.endToEndExample.steps.map((step, index) => <li key={`${index}-${step}`} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><span className="font-mono text-xs text-emerald-900/70">{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
            </ol>
          </div>
        </section>
      )}

      {uniqueContributions.length > 0 && !map.biggerPicture && (
        <section className="mb-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="concepts-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70">Connection notes</p>
          <h2 id="concepts-heading" className="mt-1 text-lg font-semibold">Topics and inferred concepts</h2>
          <div className="mt-4"><ContributionList items={uniqueContributions} /></div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="research-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70">04 · Keep following the thread</p>
            <h2 id="research-heading" className="mt-1 text-xl font-semibold tracking-tight">Research trail</h2>
            <p className="mt-1 text-sm text-muted-foreground">Findings stay attached to this map, with source links and retrieval context.</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{map.findings.length} {map.findings.length === 1 ? "source" : "sources"}</span>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setActionError(""); researchMutation.mutate(researchQuery); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="research-query">Optional research question</label>
          <input id="research-query" value={researchQuery} onChange={(event) => setResearchQuery(event.target.value)} maxLength={240} placeholder="Optional: focus the next research round" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-amber-800/60" />
          <button type="submit" disabled={isWorking} className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-900/30 px-4 py-2.5 text-sm font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800">
            {researchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Research more
          </button>
        </form>
        {researchMutation.isSuccess && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Research round complete: {researchMutation.data.addedFindings.length} new {researchMutation.data.addedFindings.length === 1 ? "finding" : "findings"} added{researchMutation.data.duplicateCount ? `, ${researchMutation.data.duplicateCount} duplicate${researchMutation.data.duplicateCount === 1 ? "" : "s"} skipped` : ""}.
          </p>
        )}
        {map.researchRounds.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {map.researchRounds.map((round, index) => <span key={round.id} className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">Round {index + 1} · {new Date(round.createdAt).toLocaleDateString()} · {round.resultCount} results</span>)}
          </div>
        )}
        {map.findings.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">{map.findings.map((finding) => <SourceCard key={finding.id} finding={finding} />)}</div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-7 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-950"><FileText className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-3 text-sm font-medium">Your research trail is ready</p>
            <p className="mt-1 text-xs text-muted-foreground">Run a research round to add verifiable sources to this map.</p>
          </div>
        )}
      </section>
      {map.entryPath === "topics" && map.overview && !map.selectedApplication && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> Choose an application above to build the Bigger Picture.</p>
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  selected,
  busy,
  onSelect,
}: {
  application: ConnectApplication;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`rounded-xl border p-4 transition ${selected ? "border-emerald-900/30 bg-emerald-50/60" : "border-border/80 bg-background"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{application.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{application.summary}</p>
        </div>
        {selected && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-950"><Check className="h-3 w-3" aria-hidden="true" /> Selected</span>}
      </div>
      {application.relevantTopics.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{application.relevantTopics.map((topic) => <span key={topic} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{topic}</span>)}</div>}
      <button type="button" onClick={onSelect} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3.5 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : selected ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Waypoints className="h-4 w-4" aria-hidden="true" />}
        {selected ? "Rebuild Bigger Picture" : "Build Bigger Picture"}
      </button>
    </article>
  );
}
