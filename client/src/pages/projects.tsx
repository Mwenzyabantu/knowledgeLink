import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Bookmark, ArrowRight, Sparkles, Trash2, CheckCircle2, Clock, FileDown, Loader2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import type { OpportunityProject, Implementation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("in-progress");
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [complexity, setComplexity] = useState("same");
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
      const res = await apiRequest("GET", `/api/implementations/${impl.id}/report`);
      const data = await res.json();
      
      const sections = [];

      // Title Page
      sections.push(
        new Paragraph({
          text: data.metadata.projectName.toUpperCase(),
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200, after: 400 },
        }),
        new Paragraph({
          text: "Technical Project Report",
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `Date: ${new Date(data.metadata.completedAt).toLocaleDateString()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 2400 },
        })
      );

      // Report Body Sections
      const contentKeys = [
        { key: "abstract", title: "EXECUTIVE SUMMARY" },
        { key: "introduction", title: "1. INTRODUCTION" },
        { key: "methodology", title: "2. METHODOLOGY" },
        { key: "code_implementation", title: "3. CODE IMPLEMENTATION" },
        { key: "results_discussion", title: "4. RESULTS & DISCUSSION" },
        { key: "conclusion_recommendations", title: "5. CONCLUSION & RECOMMENDATIONS" }
      ];

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Note: This project report is a structured summary. Some sections like specific implementation steps or media assets may need to be finalized manually.",
              italics: true,
              color: "666666",
              size: 20
            })
          ],
          spacing: { before: 200, after: 400 },
          alignment: AlignmentType.CENTER
        })
      );

      contentKeys.forEach(({ key, title }) => {
        const content = data.report[key];
        if (content) {
          sections.push(
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            ...content.split("\n").filter((l: string) => l.trim()).map((line: string) => 
              new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 24 })],
                spacing: { before: 120, after: 120 },
                alignment: AlignmentType.BOTH,
              })
            )
          );
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${data.metadata.projectName.replace(/\s+/g, "_")}_Report.docx`);
      
      toast({
        title: "Report Downloaded",
        description: "Your professional project report has been generated as a Word document.",
      });
    } catch (error) {
      console.error("Failed to download report:", error);
      toast({
        title: "Download Failed",
        description: "Could not generate the Word report. Please try again.",
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

  const inProgressImplementations = useMemo(() => {
    // Group by conceptId and project title (normalized) to show only one version
    const grouped = new Map<string, Implementation>();
    implementations
      .filter(impl => impl.status === "in progress")
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

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/opportunity-projects/generate", { complexity });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunity-projects"] });
      setShowGenerateDialog(false);
      toast({
        title: "Projects generated",
        description: `New ${complexity} complexity projects have been created based on your learning.`,
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
      const res = await apiRequest("DELETE", `/api/opportunity-projects/${projectId}`, {});
      return res;
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
      await apiRequest("POST", "/api/project-interactions", {
        projectId,
        action: isSaved ? "unsaved" : "saved",
      });
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
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No projects in progress</p>
              <p className="text-sm text-muted-foreground">Start an opportunity project to begin working</p>
            </div>
          )}
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
                onClick={() => setShowGenerateDialog(true)}
                disabled={generateMutation.isPending}
                size="sm"
                data-testid="button-generate-projects"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate New
              </Button>
            </div>
          </div>

          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate New Projects</DialogTitle>
                <DialogDescription>
                  Choose the complexity level for the new projects. I'll use your most recent work as a reference.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <RadioGroup value={complexity} onValueChange={setComplexity} className="grid gap-4">
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="easier" id="easier" />
                    <Label htmlFor="easier" className="font-normal cursor-pointer flex-1">
                      <div className="font-medium">Easier</div>
                      <div className="text-xs text-muted-foreground text-pretty">Simpler projects to reinforce current knowledge.</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="same" id="same" />
                    <Label htmlFor="same" className="font-normal cursor-pointer flex-1">
                      <div className="font-medium">Same Level</div>
                      <div className="text-xs text-muted-foreground text-pretty">Stay at your current pace with similar challenges.</div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced" className="font-normal cursor-pointer flex-1">
                      <div className="font-medium">Advanced</div>
                      <div className="text-xs text-muted-foreground text-pretty">Push your boundaries with more complex implementations.</div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(false)}
                  disabled={generateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  data-testid="button-confirm-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Projects"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {project.skills.map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
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
