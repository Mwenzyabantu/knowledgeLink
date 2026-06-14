import { Card } from "@/components/ui/card";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useSidebar } from "@/components/ui/sidebar";
import type { Concept, OpportunityProject, IdeaSession } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface StatItemProps {
  label: string;
  value: string | number;
  subtitle?: string;
  details?: {
    type: "concepts" | "favorites" | "categories" | "latest" | "opportunityProjects" | "ideaSessions";
    concepts?: Concept[];
    categories?: Map<string, number>;
    projects?: OpportunityProject[];
    ideaSessions?: IdeaSession[];
    totalCount?: number;
    todayCount?: number;
  };
}

const PREVIEW_LIMIT = 3;

export function StatItem({ label, value, subtitle, details }: StatItemProps) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  const handleNavigate = () => {
    setIsOpen(false);
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
    if (details?.type === "concepts") {
      setLocation("/knowledge?tab=all");
    } else if (details?.type === "favorites") {
      setLocation("/knowledge?tab=favorites");
    } else if (details?.type === "categories") {
      setLocation("/knowledge");
    } else if (details?.type === "latest") {
      setLocation("/history");
    } else if (details?.type === "opportunityProjects") {
      setLocation("/projects?tab=opportunities");
    } else if (details?.type === "ideaSessions") {
      setLocation("/ideas");
    }
  };

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

  const renderDetails = () => {
    if (!details) return null;

    switch (details.type) {
      case "concepts": {
        const visibleConceptsList = details.concepts?.slice(0, PREVIEW_LIMIT) || [];
        const hasMoreConcepts = (details.concepts?.length || 0) > PREVIEW_LIMIT;

        const handleConceptClick = (conceptId: number, category: string) => {
          setIsOpen(false);
          if (isMobile) {
            setOpenMobile(false);
          } else {
            setOpen(false);
          }
          setLocation(`/knowledge?tab=${category.toLowerCase()}&conceptId=${conceptId}`);
        };

        return (
          <div className="space-y-2">
            {visibleConceptsList.length > 0 ? (
              visibleConceptsList.map((concept) => (
                <div
                  key={concept.id}
                  onClick={() => handleConceptClick(concept.id, concept.category)}
                  className="p-3 bg-muted rounded-md flex items-center justify-between gap-2 cursor-pointer hover-elevate active-elevate-2"
                >
                  <p className="text-sm">{concept.title}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {concept.category}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No concepts to display</p>
            )}
            {hasMoreConcepts && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleNavigate}
                  className="text-xs px-3 py-1 rounded-md text-muted-foreground hover-elevate active-elevate-2"
                >
                  +{(details.concepts?.length || 0) - PREVIEW_LIMIT} more
                </button>
              </div>
            )}
          </div>
        );
      }

      case "favorites":
      case "latest": {
        const visibleConcepts = details.concepts?.slice(0, PREVIEW_LIMIT) || [];
        const hasMore = (details.concepts?.length || 0) > PREVIEW_LIMIT;

        const handleFavOrLatestClick = (conceptId: number, type: string) => {
          setIsOpen(false);
          if (isMobile) {
            setOpenMobile(false);
          } else {
            setOpen(false);
          }
          const tab = type === "favorites" ? "favorites" : "all";
          setLocation(`/knowledge?tab=${tab}&conceptId=${conceptId}`);
        };

        return (
          <div className="space-y-2">
            {visibleConcepts.length > 0 ? (
              visibleConcepts.map((concept) => (
                <div
                  key={concept.id}
                  onClick={() => handleFavOrLatestClick(concept.id, details.type)}
                  className="p-3 bg-muted rounded-md flex items-center justify-between gap-2 cursor-pointer hover-elevate active-elevate-2"
                >
                  <p className="text-sm">{concept.title}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {concept.category}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No items to display</p>
            )}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleNavigate}
                  className="text-xs px-3 py-1 rounded-md text-muted-foreground hover-elevate active-elevate-2"
                >
                  +{(details.concepts?.length || 0) - PREVIEW_LIMIT} more
                </button>
              </div>
            )}
          </div>
        );
      }

      case "opportunityProjects": {
        const visibleProjects = details.projects?.slice(0, PREVIEW_LIMIT) || [];
        const hasMoreProjects = (details.projects?.length || 0) > PREVIEW_LIMIT;

        const handleProjectClick = (projectId: number) => {
          setIsOpen(false);
          if (isMobile) {
            setOpenMobile(false);
          } else {
            setOpen(false);
          }
          setLocation(`/projects?tab=opportunities&projectId=${projectId}`);
        };

        return (
          <div className="space-y-2">
            {visibleProjects.length > 0 ? (
              visibleProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="p-3 bg-muted rounded-md flex items-center justify-between gap-2 cursor-pointer hover-elevate active-elevate-2"
                >
                  <p className="text-sm">{project.title}</p>
                  <Badge variant="secondary" className="shrink-0 capitalize text-xs">
                    {project.difficulty}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No projects to display
              </p>
            )}
            {hasMoreProjects && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleNavigate}
                  className="text-xs px-3 py-1 rounded-md text-muted-foreground hover-elevate active-elevate-2"
                >
                  +{(details.projects?.length || 0) - PREVIEW_LIMIT} more
                </button>
              </div>
            )}
          </div>
        );
      }

      case "ideaSessions": {
        const sessions = details.ideaSessions || [];
        const sorted = [...sessions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const visible = sorted.slice(0, PREVIEW_LIMIT);
        const hasMore = sorted.length > PREVIEW_LIMIT;

        const handleIdeaClick = (ideaId: number) => {
          setIsOpen(false);
          if (isMobile) {
            setOpenMobile(false);
          } else {
            setOpen(false);
          }
          setLocation(`/ideas?session=${ideaId}`);
        };

        return (
          <div className="space-y-2">
            {visible.length > 0 ? (
              visible.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => handleIdeaClick(idea.id)}
                  className="p-3 bg-muted rounded-md flex items-center justify-between gap-2 cursor-pointer hover-elevate active-elevate-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{idea.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(idea.status)} className="shrink-0 text-xs">
                    {getStatusLabel(idea.status)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No ideas yet</p>
            )}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleNavigate}
                  className="text-xs px-3 py-1 rounded-md text-muted-foreground hover-elevate active-elevate-2"
                >
                  +{sorted.length - PREVIEW_LIMIT} more
                </button>
              </div>
            )}
          </div>
        );
      }

      case "categories":
        return (
          <div className="space-y-2">
            {details.categories && details.categories.size > 0 ? (
              Array.from(details.categories.entries())
                .slice(0, PREVIEW_LIMIT)
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <p className="text-sm">{category}</p>
                    <Badge variant="secondary">
                      {count}
                    </Badge>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground">No categories</p>
            )}
            {(details.categories?.size || 0) > PREVIEW_LIMIT && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleNavigate}
                  className="text-xs px-3 py-1 rounded-md text-muted-foreground hover-elevate active-elevate-2"
                >
                  +{(details.categories?.size || 0) - PREVIEW_LIMIT} more
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const dialogTitle = {
    concepts: "Concepts",
    favorites: "Favorites",
    categories: "Categories",
    latest: "Recent Concepts",
    opportunityProjects: "Opportunity Projects",
    ideaSessions: "Ideas",
  }[details?.type || "concepts"];

  const dialogDescription = {
    concepts: "Your complete collection of learned concepts, grouped by category",
    favorites: "Concepts you've marked as favorites",
    categories: "How your concepts are distributed across subjects",
    latest: "Your most recently learned concepts",
    opportunityProjects: "Real-world projects to apply your learning",
    ideaSessions: "Ideas you've been developing into projects",
  }[details?.type || "concepts"];

  const buttonLabels = {
    concepts: "See All Concepts",
    favorites: "View All Favorites",
    categories: "View by Category",
    latest: "View Timeline",
    opportunityProjects: "View All Projects",
    ideaSessions: "View All Ideas",
  }[details?.type || "concepts"];

  return (
    <>
      <Card
        className="p-4 hover-elevate transition-all duration-200 cursor-pointer"
        onClick={() => details && setIsOpen(true)}
        data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {label}
        </p>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-3xl font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </p>
          {details?.type === "latest" && details?.todayCount !== undefined && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-muted-foreground bg-muted">
              Today
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </Card>

      {details && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {renderDetails()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
