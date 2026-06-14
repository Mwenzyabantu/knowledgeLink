import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, ArrowRight, Sparkles, Trash2, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import type { OpportunityProject } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { useToast } from "@/hooks/use-toast";

export default function Opportunities() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<OpportunityProject[]>({
    queryKey: ["/api/opportunity-projects"],
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const prefs = localStorage.prefs.get();
      localStorage.prefs.set({ ...prefs, personalization: { ...(prefs.personalization || {}), location } });
      return { location };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-personalization"] });
    }
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Simple location request
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            const locationString = data.address.city || data.address.town || data.address.village || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            updateLocationMutation.mutate(locationString);
          } catch (error) {
            console.error("Failed to update location:", error);
          }
        },
        (error) => {
          console.warn("Location access denied or unavailable:", error.message);
        }
      );
    }
  }, []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Static: generate from localStorage
      const concepts = localStorage.concepts.getAll();
      const prefs = localStorage.prefs.get();
      // Generate dummy projects based on concepts
      const mockProjects = concepts.map((c: any) => ({
        id: crypto.randomUUID(),
        title: `Build with ${c.title}`,
        summary: `Apply ${c.title} to a real project.`,
        difficulty: "intermediate",
        skills: [c.title],
        status: "opportunity",
        createdAt: new Date().toISOString(),
      } as any));
      for (const p of mockProjects) {
        localStorage.projects.add(p);
      }
      return { count: mockProjects.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-projects"] });
      toast({
        title: "Projects generated",
        description: "New opportunity projects have been created based on your learning.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Unable to generate projects. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      localStorage.projects.delete(projectId.toString());
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-projects"] });
      toast({
        title: "Project deleted",
        description: "The project has been removed from your list.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete the project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.summary.toLowerCase().includes(query) ||
          p.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    }

    if (selectedDifficulty) {
      filtered = filtered.filter((p) => p.difficulty === selectedDifficulty);
    }

    return filtered;
  }, [projects, searchQuery, selectedDifficulty]);

  const difficulties = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.difficulty)));
  }, [projects]);

  const handleStartProject = (projectId: number) => {
    setLocation(`/implementation/preview/${projectId}`);
  };

  const handleSaveProject = async (projectId: number) => {
    const isSaved = savedProjects.has(projectId);
    
    setSavedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });

    try {
      // Static: track interaction in localStorage
    } catch (error) {
      console.error("Failed to track interaction:", error);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (confirm("Are you sure you want to delete this project? This will help us learn what types of projects you're interested in.")) {
      deleteMutation.mutate(projectId);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "secondary";
      case "intermediate":
        return "default";
      case "advanced":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Everyday Opportunities</h1>
            <p className="text-sm text-muted-foreground">
              Turn what you've learned into simple solutions for everyday problems
            </p>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-projects"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : "Generate Projects"}
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-6 border-0 border-b rounded-none focus-visible:ring-0 text-sm"
            data-testid="input-search-projects"
          />
        </div>

        {difficulties.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={selectedDifficulty === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty(null)}
              data-testid="button-filter-all"
            >
              All
            </Button>
            {difficulties.map((difficulty) => (
              <Button
                key={difficulty}
                variant={selectedDifficulty === difficulty ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDifficulty(difficulty)}
                data-testid={`button-filter-${difficulty}`}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 py-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground py-6">Loading projects...</p>
        )}

        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              No opportunity projects yet. Generate some based on your learning!
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-first-projects"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Projects
            </Button>
          </div>
        )}

        {!isLoading &&
          filteredProjects.map((project) => {
            const isSaved = savedProjects.has(project.id);

            return (
              <Card
                key={project.id}
                className="p-4 hover-elevate"
                data-testid={`card-project-${project.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </h3>
                      <Badge variant={getDifficultyColor(project.difficulty)} data-testid={`badge-difficulty-${project.id}`}>
                        {project.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed" data-testid={`text-project-summary-${project.id}`}>
                      {project.summary}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.skills.slice(0, 4).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-skill-${project.id}-${idx}`}>
                          {skill}
                        </Badge>
                      ))}
                      {project.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.skills.length - 4} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span data-testid={`text-estimated-hours-${project.id}`}>
                        ~{project.estimatedHours} hours
                      </span>
                      {project.locationContext && (
                        <span className="flex items-center gap-1" data-testid={`text-location-${project.id}`}>
                          <MapPin className="h-3 w-3" />
                          {project.locationContext}
                        </span>
                      )}
                      {project.problemType === "everyday" && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/5 border-primary/20 text-primary">
                          Everyday Problem
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSaveProject(project.id)}
                      data-testid={`button-save-project-${project.id}`}
                    >
                      <Bookmark
                        className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteProject(project.id)}
                      data-testid={`button-delete-project-${project.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStartProject(project.id)}
                      data-testid={`button-start-project-${project.id}`}
                    >
                      Start
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
