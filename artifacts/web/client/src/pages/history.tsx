import { TimelineItem } from "@/components/timeline-item";
import { Input } from "@/components/ui/input";
import { Search, Clock, Lightbulb } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Concept, Implementation, OpportunityProject, IdeaSession } from "@shared/schema";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function History() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("concepts");
  const [, setLocation] = useLocation();

  // Scroll to top on mount
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
  });

  const { data: implementations = [] } = useQuery<Implementation[]>({
    queryKey: ["/api/implementations"],
  });

  const { data: opportunityProjects = [] } = useQuery<OpportunityProject[]>({
    queryKey: ["/api/opportunity-projects"],
  });

  const { data: ideaSessions = [] } = useQuery<IdeaSession[]>({
    queryKey: ["/api/idea-sessions"],
  });

  const allConcepts = concepts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter concepts based on search
  const filteredConcepts = allConcepts.filter(concept =>
    concept.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concept.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine and sort projects
  const allProjects = [
    ...implementations.map(impl => ({
      ...impl,
      projectType: "implementation" as const,
      displayTitle: impl.projectName,
    })),
    ...opportunityProjects.map(proj => ({
      ...proj,
      projectType: "opportunity" as const,
      displayTitle: proj.title,
    })),
  ].sort((a, b) => {
    const dateA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : new Date(a.createdAt).getTime();
    const dateB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Filter projects based on search
  const filteredProjects = allProjects.filter(project =>
    project.displayTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort and filter idea sessions
  const sortedIdeas = ideaSessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(idea =>
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.ideaSummary && idea.ideaSummary.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // Timeline items for concepts
  const conceptTimelineItems = filteredConcepts.map((concept) => {
    try {
      const accessDate = concept.lastAccessedAt ? new Date(concept.lastAccessedAt) : new Date(concept.createdAt);
      
      if (isNaN(accessDate.getTime())) {
        throw new Error("Invalid date");
      }
      
      const isTodayAccess = isToday(accessDate);
      const lastAccessedDate = isTodayAccess
        ? formatDistanceToNow(accessDate, { addSuffix: true })
        : format(accessDate, "do MMM, yyyy · HH:mm");

      return {
        title: concept.title,
        category: concept.category,
        date: format(new Date(concept.createdAt), "do MMM, yyyy"),
        lastAccessedDate,
        conceptId: concept.id,
        isFavorite: concept.isFavorite,
      };
    } catch (error) {
      return {
        title: concept.title,
        category: concept.category,
        date: "Invalid date",
        lastAccessedDate: "Invalid date",
        conceptId: concept.id,
        isFavorite: concept.isFavorite,
      };
    }
  });

  // Timeline items for projects
  const projectTimelineItems = filteredProjects.map((project) => {
    try {
      const accessDate = project.lastAccessedAt ? new Date(project.lastAccessedAt) : new Date(project.createdAt);
      
      if (isNaN(accessDate.getTime())) {
        throw new Error("Invalid date");
      }
      
      const isTodayAccess = isToday(accessDate);
      const lastAccessedDate = isTodayAccess
        ? formatDistanceToNow(accessDate, { addSuffix: true })
        : format(accessDate, "do MMM, yyyy · HH:mm");

      return {
        title: project.displayTitle,
        isOpportunityProject: project.projectType === "opportunity",
        lastAccessedDate,
        projectId: project.id,
      };
    } catch (error) {
      return {
        title: project.displayTitle,
        isOpportunityProject: project.projectType === "opportunity",
        lastAccessedDate: "Invalid date",
        projectId: project.id,
      };
    }
  });

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "completed": return "default";
      case "analyzed": return "secondary";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "analyzed": return "Analyzed";
      case "chatting": return "In Progress";
      default: return status;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section with generous spacing */}
      <div className="py-8">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Learning History</h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Your journey connecting concepts to real-world problems
        </p>
      </div>

      {/* Search Bar with warm styling */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search your learning history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base border-border focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Timeline Tabs */}
      <div className="mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("concepts")}
            className={`pb-3 font-semibold text-base transition-colors ${
              activeTab === "concepts"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-concepts"
          >
            <span className="flex items-center gap-2">
              Concepts Timeline
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground bg-muted" data-testid="badge-concepts-count">
                {conceptTimelineItems.length}
              </Badge>
            </span>
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`pb-3 font-semibold text-base transition-colors ${
              activeTab === "projects"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-projects"
          >
            <span className="flex items-center gap-2">
              Projects Timeline
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground bg-muted" data-testid="badge-projects-count">
                {projectTimelineItems.length}
              </Badge>
            </span>
          </button>
          <button
            onClick={() => setActiveTab("ideas")}
            className={`pb-3 font-semibold text-base transition-colors ${
              activeTab === "ideas"
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-ideas"
          >
            <span className="flex items-center gap-2">
              Ideas Timeline
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground bg-muted" data-testid="badge-ideas-count">
                {sortedIdeas.length}
              </Badge>
            </span>
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div>
        {activeTab === "concepts" && (
          <div>
            {conceptTimelineItems.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No concepts yet</h3>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Your concepts timeline will appear here as you add concepts
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conceptTimelineItems.map((item, index) => (
                  <TimelineItem
                    key={`concept-${index}`}
                    {...item}
                    isLast={index === conceptTimelineItems.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "projects" && (
          <div>
            {projectTimelineItems.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Your projects timeline will appear here as you work on projects
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {projectTimelineItems.map((item, index) => (
                  <div key={`project-${index}`} className="flex gap-4 pb-6">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1" />
                      {!(index === projectTimelineItems.length - 1) && <div className="flex-1 w-px bg-border mt-2" />}
                    </div>
                    <div className="flex-1 pt-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold" data-testid="text-title">
                          {item.title}
                        </h3>
                        {item.isOpportunityProject && (
                          <Badge variant="secondary" className="text-xs" data-testid="badge-opportunity">
                            Opportunity Project
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{item.lastAccessedDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "ideas" && (
          <div>
            {sortedIdeas.length === 0 ? (
              <div className="text-center py-16">
                <Lightbulb className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No ideas yet</h3>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Use the Build on Idea section to start turning your ideas into projects
                </p>
                <button
                  onClick={() => setLocation("/ideas")}
                  className="mt-4 text-sm text-primary underline underline-offset-4"
                  data-testid="link-start-idea"
                >
                  Start your first idea
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedIdeas.map((idea, index) => {
                  let createdDate = "Unknown date";
                  try {
                    const date = new Date(idea.createdAt);
                    createdDate = isToday(date)
                      ? formatDistanceToNow(date, { addSuffix: true })
                      : format(date, "do MMM, yyyy · HH:mm");
                  } catch {}

                  const analysis = idea.analysis as any;
                  const readinessScore = analysis?.readinessScore;

                  return (
                    <div key={`idea-${idea.id}`} className="flex gap-4 pb-6" data-testid={`idea-item-${idea.id}`}>
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1" />
                        {index < sortedIdeas.length - 1 && <div className="flex-1 w-px bg-border mt-2" />}
                      </div>
                      <div className="flex-1 pt-0">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
                          <button
                            onClick={() => setLocation("/ideas")}
                            className="text-sm font-semibold text-left hover:underline"
                            data-testid={`link-idea-${idea.id}`}
                          >
                            {idea.title}
                          </button>
                          <div className="flex items-center gap-2 flex-wrap">
                            {readinessScore !== undefined && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-readiness-${idea.id}`}>
                                {readinessScore}% ready
                              </Badge>
                            )}
                            <Badge variant={getStatusBadgeVariant(idea.status)} className="text-xs" data-testid={`badge-status-${idea.id}`}>
                              {getStatusLabel(idea.status)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{createdDate}</p>
                        {idea.ideaSummary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{idea.ideaSummary}</p>
                        )}
                        {idea.projectId && (
                          <button
                            onClick={() => setLocation(`/projects?tab=opportunities&projectId=${idea.projectId}`)}
                            className="text-xs text-primary underline underline-offset-4 mt-1"
                            data-testid={`link-idea-project-${idea.id}`}
                          >
                            View generated project
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
