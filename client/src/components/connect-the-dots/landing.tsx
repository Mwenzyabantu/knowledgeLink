import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, BookOpen, Check, FileText, Loader2, Waypoints } from "lucide-react";
import type { LandingProps } from "./types";
import { ErrorNotice, MapCard, SkeletonBlock } from "./common";

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}{required && <span className="ml-1 text-amber-800" aria-hidden="true">*</span>}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-amber-800/60"
      />
    </label>
  );
}

export function Landing({
  courses,
  coursesLoading,
  coursesError,
  retryCourses,
  maps,
  mapsLoading,
  mapsError,
  retryMaps,
  createCourse,
  updateCourse,
  createMap,
  deleteMap,
}: LandingProps) {
  const [, setLocation] = useLocation();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [career, setCareer] = useState("");
  const [program, setProgram] = useState("");
  const [courseName, setCourseName] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [knownUse, setKnownUse] = useState("");
  const [entryPath, setEntryPath] = useState<"topics" | "known_use">("topics");
  const [formError, setFormError] = useState("");
  const [courseDirty, setCourseDirty] = useState(false);

  const topics = useMemo(
    () => topicsText.split(/\n/).map((topic) => topic.trim()).filter(Boolean).filter((topic, index, list) => list.findIndex((value) => value.toLowerCase() === topic.toLowerCase()) === index),
    [topicsText],
  );
  const courseInput = { career: career.trim(), program: program.trim(), courseName: courseName.trim(), topics };

  const chooseCourse = (id: string) => {
    setSelectedCourseId(id);
    setCourseDirty(false);
    const selected = courses.find((course) => course.id === id);
    setCareer(selected?.career ?? "");
    setProgram(selected?.program ?? "");
    setCourseName(selected?.courseName ?? "");
    setTopicsText(selected?.topics.map((topic) => topic.topic).join("\n") ?? "");
    setFormError("");
  };

  const startMap = async () => {
    setFormError("");
    if (!courseInput.career || !courseInput.program || !courseInput.courseName) {
      setFormError("Add your career path, program, and course before continuing.");
      return;
    }
    if (entryPath === "topics" && topics.length === 0) {
      setFormError("Add at least one course topic to build a topic map. Or choose the known-use path.");
      return;
    }
    if (entryPath === "known_use" && !knownUse.trim()) {
      setFormError("Describe the real-world use you have in mind.");
      return;
    }
    try {
      let courseId = selectedCourseId;
      if (courseId && courseDirty) {
        const saved = await updateCourse.mutateAsync({ id: courseId, input: courseInput });
        courseId = saved.id;
      } else if (!courseId) {
        const saved = await createCourse.mutateAsync(courseInput);
        courseId = saved.id;
      }
      await createMap.mutateAsync({
        courseId,
        entryPath,
        ...(entryPath === "known_use" ? { knownUse: knownUse.trim() } : {}),
      });
    } catch {
      setFormError("");
    }
  };

  const isSaving = createCourse.isPending || updateCourse.isPending || createMap.isPending;
  const mutationError = createCourse.error || updateCourse.error || createMap.error || deleteMap.error;

  return (
    <div className="mx-auto w-full max-w-6xl pb-8">
      <header className="relative mb-8 overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-orange-50/70 to-emerald-50/60 px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-8 -top-12 hidden h-64 w-64 opacity-40 sm:block" aria-hidden="true">
          <svg viewBox="0 0 220 220" className="h-full w-full text-amber-900">
            <path d="M28 164 70 118 108 135 152 72 194 48M70 118 72 54 108 135 152 170 194 118" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 5" />
            {[ [28,164], [70,118], [108,135], [152,72], [194,48], [72,54], [152,170], [194,118] ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="currentColor" />)}
          </svg>
        </div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-amber-900/75">
          <Waypoints className="h-4 w-4" aria-hidden="true" /> Learning, with context
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Connect the dots.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
          Start with something from class—or a real-world use you have noticed. Follow the ideas into the systems and work they make possible.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-amber-950/70">
          <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Course-rooted</span>
          <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" aria-hidden="true" /> Source-backed</span>
          <span className="inline-flex items-center gap-1.5"><Waypoints className="h-3.5 w-3.5" aria-hidden="true" /> Easy to revisit</span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="start-map-heading">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70">Start a new map</p>
            <h2 id="start-map-heading" className="mt-1 text-xl font-semibold tracking-tight">Where should we begin?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your course gives the map its context. You can start with topics or with a use you already know.</p>
          </div>

          {coursesError && <div className="mb-4"><ErrorNotice message={`Saved courses could not be loaded. ${coursesError}`} retry={retryCourses} /></div>}

          {courses.length > 0 && (
            <label className="mb-5 block space-y-1.5 text-sm">
              <span className="font-medium">Use a saved course</span>
              <select
                value={selectedCourseId}
                onChange={(event) => chooseCourse(event.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-800/60"
              >
                <option value="">Add a new course instead</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.courseName} · {course.program}</option>)}
              </select>
            </label>
          )}
          {coursesLoading && <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Checking for saved courses…</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Career path" value={career} onChange={(value) => { setCareer(value); setCourseDirty(true); }} placeholder="e.g. Engineering" required />
            <Field label="Program or major" value={program} onChange={(value) => { setProgram(value); setCourseDirty(true); }} placeholder="e.g. Civil engineering" required />
            <div className="sm:col-span-2">
              <Field label="Course" value={courseName} onChange={(value) => { setCourseName(value); setCourseDirty(true); }} placeholder="e.g. Water resources management" required />
            </div>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold">Choose your starting point</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setEntryPath("topics")}
                aria-pressed={entryPath === "topics"}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 ${entryPath === "topics" ? "border-amber-900 bg-amber-50/70 ring-1 ring-amber-900/20" : "border-border hover:border-amber-900/30"}`}
              >
                <span className="flex items-center justify-between gap-2 font-medium">Course topics <span className={`grid h-5 w-5 place-items-center rounded-full border ${entryPath === "topics" ? "border-amber-900 bg-amber-900 text-white" : "border-border"}`}>{entryPath === "topics" && <Check className="h-3 w-3" aria-hidden="true" />}</span></span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">See how concepts from class connect inside real systems.</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryPath("known_use")}
                aria-pressed={entryPath === "known_use"}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 ${entryPath === "known_use" ? "border-amber-900 bg-amber-50/70 ring-1 ring-amber-900/20" : "border-border hover:border-amber-900/30"}`}
              >
                <span className="flex items-center justify-between gap-2 font-medium">A use I know <span className={`grid h-5 w-5 place-items-center rounded-full border ${entryPath === "known_use" ? "border-amber-900 bg-amber-900 text-white" : "border-border"}`}>{entryPath === "known_use" && <Check className="h-3 w-3" aria-hidden="true" />}</span></span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Describe an application. We’ll compare it with any course topics you’ve saved.</span>
              </button>
            </div>
          </fieldset>

          {entryPath === "topics" ? (
            <label className="mt-5 block space-y-1.5 text-sm">
              <span className="font-medium">Your course topics <span className="text-muted-foreground">(one per line)</span></span>
              <textarea
                value={topicsText}
                onChange={(event) => { setTopicsText(event.target.value); setCourseDirty(true); }}
                rows={4}
                placeholder={"Add the topics you have covered\nFor example: fluid dynamics"}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-amber-800/60"
                aria-describedby="topics-hint"
              />
              <span id="topics-hint" className="block text-xs text-muted-foreground">These remain labeled as your course topics, separate from concepts inferred by the map.</span>
            </label>
          ) : (
            <div className="mt-5 space-y-4">
              {topics.length > 0 && (
                <div className="rounded-lg border border-emerald-900/15 bg-emerald-50/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-950/70">Saved course topics for comparison</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topics.map((topic) => <span key={topic} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-950">{topic}</span>)}
                  </div>
                </div>
              )}
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">What real-world use have you noticed?</span>
                <textarea
                  value={knownUse}
                  onChange={(event) => setKnownUse(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Describe a product, system, or problem where you think your learning is being used."
                  className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-amber-800/60"
                />
                <span className="block text-right text-xs text-muted-foreground">{knownUse.length}/1000</span>
              </label>
              {!topics.length && <p className="text-xs text-muted-foreground">No course topics saved yet. You can continue without them.</p>}
            </div>
          )}

          {(formError || mutationError) && (
            <div className="mt-4">
              <ErrorNotice message={formError || `We couldn't save this map. ${String(mutationError)}`} />
            </div>
          )}
          <div className="mt-6 flex flex-col-reverse items-start justify-between gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">{selectedCourseId && !courseDirty ? "Using your saved course details." : "Course details will be saved for your next visit."}</p>
            <button
              type="button"
              onClick={() => { void startMap(); }}
              disabled={isSaving || coursesLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 sm:w-auto"
            >
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {entryPath === "known_use" && createMap.isPending ? "Saving and assessing…" : "Saving your map…"}</> : <>Begin exploring <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="saved-maps-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70">Pick up where you left off</p>
                <h2 id="saved-maps-heading" className="mt-1 text-xl font-semibold tracking-tight">Your saved maps</h2>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{maps.length}</span>
            </div>
            {mapsError ? (
              <div className="mt-4"><ErrorNotice message={`Your saved maps could not be loaded. ${mapsError}`} retry={retryMaps} /></div>
            ) : mapsLoading ? (
              <div className="mt-5 space-y-4" aria-label="Loading saved maps"><SkeletonBlock rows={2} /><SkeletonBlock rows={2} /></div>
            ) : maps.length ? (
              <div className="mt-4 space-y-3">
                {maps.map((savedMap) => <MapCard key={savedMap.id} map={savedMap} onDelete={(id) => {
                  if (window.confirm("Delete this saved learning map? This cannot be undone.")) deleteMap.mutate(id);
                }} />)}
                {deleteMap.error && <ErrorNotice message={`The map could not be deleted. ${String(deleteMap.error)}`} />}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-950"><Waypoints className="h-5 w-5" aria-hidden="true" /></span>
                <p className="mt-3 text-sm font-medium">Your first map starts here</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Create a map to keep its connections and research together for later.</p>
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-emerald-900/10 bg-emerald-50/60 p-5">
            <p className="text-sm font-semibold">A note on the connections</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your course topics are kept distinct from AI-inferred concepts. Research findings include their source and retrieval context, so you can follow the trail yourself.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
