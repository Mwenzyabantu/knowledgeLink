import { ConceptInput } from "@/components/concept-input";
import { StatItem } from "@/components/stat-item";
import { RotatingTrendHeadline } from "@/components/rotating-trend-headline";
import { useQuery } from "@tanstack/react-query";
import type { Concept, OpportunityProject, IdeaSession } from "@shared/schema";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();
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

  const { data: ideaSessions = [] } = useQuery<IdeaSession[]>({
    queryKey: ["/api/idea-sessions"],
    enabled: !!user,
  });

  const favorites = concepts.filter((c) => c.isFavorite);
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
          label="Ideas" 
          value={ideaSessions.length.toString()} 
          subtitle="Build sessions"
          details={{
            type: "ideaSessions",
            ideaSessions: ideaSessions,
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
