import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Bookmark, ArrowRight, Sparkles, Trash2, CheckCircle2, Clock, FileDown, Loader2, AlertCircle, RefreshCw, Lightbulb } from "lucide-react";
import { useLocation } from "wouter";
import type { OpportunityProject, Implementation, IdeaSession } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { generateOpportunityProjects } from "@/lib/services/supabase";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("in-progress");
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);
  const { toast } = useToast();

  // Handle tab and projectId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const projectId = params.get("projectId");
    const implementationId = params.get("implementationId");
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (implementationId || projectId) {
      const id = implementationId || projectId;
      setSearchQuery(""); // Clear search to ensure project is visible
      setTimeout(() => {
        const element = document.querySelector(`[data-testid="card-project-${id}"]`) || 
                       document.querySelector(`[data-testid="card-implementation-${id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);

  const handleDownloadReport = async (impl: Implementation) => {
    setGeneratingReportId(impl.id);
    try {
      const res = await fetch(`/api/implementations/${impl.id}/report`, {
        headers: {
          "Accept": "application/msword"
        }
      });
      
      if (!res.ok) throw new Error("Failed to download report");
      
      const blob = await res.blob();
      saveAs(blob, `${impl.projectName.replace(/\s+/g, "_")}_Report.doc`);
      
      toast({
        title: "Report Downloaded",
        description: "Your professional project report has been generated.",
      });
    } catch (error) {
      console.error("Failed to download report:", error);
      toast({
        title: "Download Failed",
        description: "Could not generate the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReportId(null);
    }
  };

  const { data: projects = [], isLoading } = useQuery<OpportunityProject[]>({
    queryKey: ["/api/opportunity-projects"],
  });

  const { data: implementations = [] } = useQuery<Implementation[]>({
    queryKey: ["/api/implementations"],
  });

  const { data: ideaSessions = [] } = useQuery<IdeaSession[]>({
    queryKey: ["/api/idea-sessions"],
  });

  // Build a map from projectId -> idea session title for quick lookup
  const ideaByProjectId = useMemo(() => {
    const map = new Map<number, IdeaSession>();
    ideaSessions.forEach((idea) => {
      if (idea.projectId) {
        map.set(idea.projectId, idea);
      }
    });
    return map;
  }, [ideaSessions]);

  const inProgressImplementations = useMemo(() => {
    // Group by conceptId and project title (normalized) to show only one version
    const grouped = new Map<string, Implementation>();
    implementations
      .filter(impl => impl.status === "in progress" || impl.status === "in_progress" || impl.status === "in-progress" || impl.status === "preview" || !impl.status)
      .forEach(impl => {
        // Normalize title: remove common parenthetical suffixes like "(AVRPS)" or similar
        const normalizedName = impl.projectName.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();
        const key = `${impl.conceptId}-${normalizedName}`;
        
        const existing = grouped.get(key);
        if (!existing || new Date(impl.lastAccessedAt) > new Date(existing.lastAccessedAt)) {
          grouped.set(key, impl);
        }
      });
    return Array.from(grouped.values());
  }, [implementations]);

  const completedImplementations = useMemo(() => {
    const grouped = new Map<string, Implementation>();
    implementations
      .filter(impl => impl.status === "completed")
      .forEach(impl => {
        const normalizedName = impl.projectName.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();
        const key = `${impl.conceptId}-${normalizedName}`;
        
        const existing = grouped.get(key);
        if (!existing || new Date(impl.lastAccessedAt) > new Date(existing.lastAccessedAt)) {
          grouped.set(key, impl);
        }
      });
    return Array.from(grouped.values());
  }, [implementations]);

  const failedImplementations = useMemo(() => {
    const grouped = new Map<string, Implementation>();
    implementations
      .filter(impl => impl.status === "failed")
      .forEach(impl => {
        const normalizedName = impl.projectName.replace(/\s*\(.*?\)\s*$/, '').trim().toLowerCase();
        const key = `${impl.conceptId}-${normalizedName}`;
        const existing = grouped.get(key);
        if (!existing || new Date(impl.lastAccessedAt) > new Date(existing.lastAccessedAt)) {
          grouped.set(key, impl);
        }
      });
    return Array.from(grouped.values());
  }, [implementations]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const concepts = localStorage.concepts.getAll();
      const prefs = localStorage.prefs.get();
      const projects = await generateOpportunityProjects(concepts as any, prefs.personalization || {});
      for (const p of projects || []) {
        localStorage.projects.add({
          id: crypto.randomUUID(),
          title: p.projectName || "Project",
          summary: p.reasons?.join(" ") || "",
          difficulty: (p.difficulty || "intermediate").toLowerCase(),
          skills: p.prerequisites || [],
          status: "opportunity",
          createdAt: new Date().toISOString(),
        } as any);
      }
      return { count: (projects || []).length };
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

  const deleteImplementationMutation = useMutation({
    mutationFn: async (impl: Implementation) => {
      // Static: delete from localStorage
      localStorage.projects.delete(impl.id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implementations"] });
      toast({ title: "Project deleted", description: "The failed project has been removed." });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Unable to delete the project. Please try again.", variant: "destructive" });
    },
  });

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
        return "default";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <h1 className="text-3xl font-bold mb-2">Projects</h1>
        <p className="text-muted-foreground">View your completed implementations and explore new opportunities</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
        <div className="border-b">
          <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="in-progress" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap flex items-center gap-2" data-testid="tab-in-progress">
              <Clock className="h-4 w-4" />
              In Progress
              <Badge variant="outline" className="text-xs">
                {inProgressImplementations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap flex items-center gap-2" data-testid="tab-completed">
              <CheckCircle2 className="h-4 w-4" />
              Completed
              <Badge variant="outline" className="text-xs">
                {completedImplementations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap flex items-center gap-2" data-testid="tab-opportunities">
              <Sparkles className="h-4 w-4" />
              Opportunities
              <Badge variant="outline" className="text-xs">
                {projects.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="in-progress" className="mt-6 space-y-4">
          {failedImplementations.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Generation failed — these projects need to be retried
              </p>
              {failedImplementations.map((impl) => (
                <Card key={impl.id} className="p-6" data-testid={`card-implementation-${impl.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{impl.projectName}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Tool: <span className="font-medium">{impl.tool}</span>
                      </p>
                      <Badge variant="destructive" className="text-xs">Generation Failed</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/implementation/${impl.id}`)}
                        data-testid={`button-retry-implementation-${impl.id}`}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteImplementationMutation.mutate(impl)}
                        disabled={deleteImplementationMutation.isPending}
                        data-testid={`button-delete-implementation-${impl.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {inProgressImplementations.length > 0 ? (
            inProgressImplementations.map((impl) => (
              <Card key={impl.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{impl.projectName}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tool: <span className="font-medium">{impl.tool}</span>
                    </p>
                    <Badge variant="secondary" className="text-xs">In Progress</Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation(`/implementation/${impl.id}`)}
                    data-testid={`button-view-implementation-${impl.id}`}
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </Card>
            ))
          ) : failedImplementations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No projects in progress</p>
              <p className="text-sm text-muted-foreground">Start a project to begin working</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {completedImplementations.length > 0 ? (
            completedImplementations.map((impl) => (
              <Card key={impl.id} className="p-6" data-testid={`card-implementation-${impl.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{impl.projectName}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tool: <span className="font-medium">{impl.tool}</span>
                    </p>
                    <Badge variant="default" className="text-xs">Completed</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleDownloadReport(impl)}
                      disabled={generatingReportId === impl.id}
                      data-testid={`button-download-report-${impl.id}`}
                    >
                      {generatingReportId === impl.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      Report
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/implementation/${impl.id}`)}
                      data-testid={`button-view-implementation-${impl.id}`}
                    >
                      View
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No completed implementations yet</p>
              <p className="text-sm text-muted-foreground">Mark projects as complete to see them here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6 space-y-4">
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="pl-6"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-projects"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedDifficulty === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDifficulty(null)}
                data-testid="button-difficulty-all"
              >
                All Levels
              </Button>
              {difficulties.map((diff) => (
                <Button
                  key={diff}
                  variant={selectedDifficulty === diff ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDifficulty(diff)}
                  data-testid={`button-difficulty-${diff}`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
              <div className="flex-1" />
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                size="sm"
                data-testid="button-generate-projects"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {generateMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project) => {
              const isSaved = savedProjects.has(project.id);
              const difficultyColor = getDifficultyColor(project.difficulty);

              return (
                <Card key={project.id} className="p-6" data-testid={`card-project-${project.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{project.summary}</p>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <Badge variant={difficultyColor}>{project.difficulty}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ~{project.estimatedHours} hours
                        </span>
                        {ideaByProjectId.has(project.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation("/ideas");
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            data-testid={`link-idea-source-${project.id}`}
                          >
                            <Lightbulb className="h-3 w-3" />
                            From idea: {ideaByProjectId.get(project.id)?.title}
                          </button>
                        )}
                      </div>
                      {(() => {
                        const idea = ideaByProjectId.get(project.id);
                        const analysis = idea?.analysis as any;
                        const alreadyHas: { skill: string; matchedConcept: string }[] = analysis?.alreadyHas || [];
                        const missing: { skill: string; importance: string }[] = analysis?.missing || [];
                        if (alreadyHas.length > 0 || missing.length > 0) {
                          return (
                            <div className="space-y-2 mt-1">
                              {alreadyHas.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Skills you have ({alreadyHas.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {alreadyHas.map((s, i) => (
                                      <Badge key={i} variant="outline" className="text-xs border-green-500/40 text-green-700 dark:text-green-400 bg-green-500/5">
                                        {s.skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {missing.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Skills to learn ({missing.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {missing.map((s, i) => (
                                      <Badge key={i} variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5">
                                        {s.skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        // Fallback: show plain skill badges
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            {project.skills.map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStartProject(project.id)}
                        data-testid={`button-start-${project.id}`}
                      >
                        Start
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        variant={isSaved ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSaveProject(project.id)}
                        data-testid={`button-save-${project.id}`}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects found matching your criteria</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
