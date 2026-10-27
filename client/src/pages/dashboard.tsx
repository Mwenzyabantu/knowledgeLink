import { ConceptInput } from "@/components/concept-input";
import { StatItem } from "@/components/stat-item";
import { RotatingTrendHeadline } from "@/components/rotating-trend-headline";
import { useQuery } from "@tanstack/react-query";
import type { Concept, OpportunityProject, ConnectMapSummary } from "@shared/schema";
import { useLocation } from "wouter";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/hooks/use-auth";
import { ArrowRight, Waypoints } from "lucide-react";

export default function Dashboard() {
  const authContext = useContext(AuthContext);
  const { user } = authContext || { user: null };
  const [, setLocation] = useLocation();
  const [isConceptInputTyping, setIsConceptInputTyping] = useState(false);

  // Scroll to top on page load - scroll the main content container
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
    enabled: !!user,
  });

  const { data: opportunityProjects = [] } = useQuery<OpportunityProject[]>({
    queryKey: ["/api/opportunity-projects"],
    enabled: !!user,
  });

  const {
    data: learningMaps = [],
    isLoading: learningMapsLoading,
    isError: learningMapsError,
  } = useQuery<ConnectMapSummary[]>({
    queryKey: ["/api/connect-the-dots/maps"],
    enabled: !!user,
  });

  const favorites = concepts.filter((c) => c.isFavorite);
  const recentMap = learningMaps[0];
  const recentConcepts = concepts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  
  const todaysConcepts = concepts.filter((c) => {
    const conceptDate = new Date(c.createdAt);
    const today = new Date();
    return conceptDate.toDateString() === today.toDateString();
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-8">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Connect what you learn to the problems it solves
        </p>
      </div>

      <section className="mb-5 overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-orange-50/70 to-emerald-50/60 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-900 text-amber-50">
              <Waypoints className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/70">A learning map, from class to world</p>
              <h2 className="text-xl font-semibold tracking-tight">Connect the dots</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                See how course ideas work together in real systems, career applications, and source-backed research.
              </p>
              <p className="mt-3 text-xs text-amber-950/70">
                {learningMapsLoading
                  ? "Checking your saved maps…"
                  : learningMapsError
                  ? "Your saved maps are temporarily unavailable."
                  : learningMaps.length > 0
                  ? `${learningMaps.length} saved ${learningMaps.length === 1 ? "map" : "maps"} ready to revisit`
                  : "Start with a course topic or a real-world use you already know"}
              </p>
            </div>
          </div>
          {learningMapsLoading ? (
            <span className="shrink-0 text-sm text-muted-foreground" role="status">Loading your maps…</span>
          ) : learningMapsError ? (
            <button
              type="button"
              onClick={() => setLocation("/connect-the-dots")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-900/30 px-4 py-2.5 text-sm font-medium text-amber-950 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
            >
              Open Connect the dots <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : recentMap ? (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setLocation(`/connect-the-dots/${recentMap.id}`)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
              >
                Continue your recent map <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLocation("/connect-the-dots")}
                className="inline-flex items-center justify-center rounded-lg border border-amber-900/30 px-4 py-2.5 text-sm font-medium text-amber-950 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
              >
                Start a new map
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLocation("/connect-the-dots")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
            >
              Start a map <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
        <StatItem 
          label="Concepts" 
          value={concepts.length.toString()} 
          subtitle="Total learned"
          details={{
            type: "concepts",
            concepts: concepts,
          }}
        />
        <StatItem 
          label="Favorites" 
          value={favorites.length.toString()} 
          subtitle="Starred"
          details={{
            type: "favorites",
            concepts: favorites,
          }}
        />
        <StatItem 
          label="Opportunity Projects" 
          value={opportunityProjects.length.toString()} 
          subtitle="Available"
          details={{
            type: "opportunityProjects",
            projects: opportunityProjects,
          }}
        />
        <StatItem 
          label="Latest" 
          value={todaysConcepts.length.toString()} 
          subtitle="Recent activity"
          details={{
            type: "latest",
            concepts: recentConcepts,
            todayCount: todaysConcepts.length,
          }}
        />
      </div>

      <div className="py-6">
        <RotatingTrendHeadline />
      </div>

      <ConceptInput onTypingChange={setIsConceptInputTyping} />
    </div>
  );
}
