import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { GenerationStatusPage } from "@/components/generation-status-page";
import { useQuery } from "@tanstack/react-query";

export default function ImplementationPreview() {
  const [, params] = useRoute("/implementation/preview/:conceptId");
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShowingStatusPage, setIsShowingStatusPage] = useState(false);

  const conceptId = params?.conceptId ? parseInt(params.conceptId) : null;

  const { data: implementations } = useQuery<any[]>({
    queryKey: ["/api/implementations"],
  });

  const { data: opportunityProjects, isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ["/api/opportunity-projects"],
  });

  const opportunityProject = opportunityProjects?.find(
    (op) => op.id === conceptId
  );

  const isOpportunityProject = !!opportunityProject || !!implementations?.find(
    (impl) => impl.conceptId === conceptId && impl.status === "preview"
  )?.whySuggested?.toLowerCase().includes("opportunity");

  const previewData = opportunityProject ? {
    id: opportunityProject.id,
    conceptId: opportunityProject.relatedConceptIds?.[0] || 0,
    projectName: opportunityProject.title,
    type: "Implementation Project",
    components: opportunityProject.skills || [],
    learningGoals: [opportunityProject.summary],
  } : null;

  const handleGenerateNew = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  };

  const handleProceed = () => {
    setIsShowingStatusPage(true);
  };

  const handleGenerationComplete = (newImplementationId?: number) => {
    if (newImplementationId) {
      setLocation(`/implementation/${newImplementationId}`);
    } else if (previewData) {
      setLocation(`/implementation/${previewData.id}`);
    } else {
      setLocation("/projects");
    }
  };

  const handleCancel = () => {
    setIsShowingStatusPage(false);
  };

  if (isShowingStatusPage && previewData) {
    return (
      <GenerationStatusPage
        implementationId={previewData.id}
        onComplete={handleGenerationComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/projects")}
          className="mb-6"
          data-testid="button-back-to-projects"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-2xl font-semibold mb-1">Implementation Preview</h1>
              <p className="text-sm text-muted-foreground">
                Based on your conversation, here's what I'll create
              </p>
            </div>
          </div>

          {isLoadingProjects ? (
            <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading project details...</span>
            </div>
          ) : !previewData ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Project not found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This project may have been deleted or is no longer available.
                </p>
              </div>
              <Button onClick={() => setLocation("/projects")} data-testid="button-go-to-projects">
                Go to Projects
              </Button>
            </div>
          ) : isGenerating ? (
            <div className="border-l-2 border-primary pl-4 py-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">Generating alternative implementation...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-l-2 border-primary pl-4 py-4">
                <h2 className="text-xl font-semibold mb-1">{previewData.projectName}</h2>
                <p className="text-sm text-muted-foreground">{previewData.type}</p>
              </div>

              {previewData.components.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Components</h3>
                  <ul className="space-y-2">
                    {previewData.components.map((component: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{component}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {previewData.learningGoals.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Learning Goals</h3>
                  <ul className="space-y-2">
                    {previewData.learningGoals.map((goal: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 flex-wrap pt-4 border-t">
                {!isOpportunityProject && (
                  <Button
                    variant="outline"
                    onClick={handleGenerateNew}
                    data-testid="button-generate-new"
                  >
                    Generate New Implementation
                  </Button>
                )}
                <Button
                  onClick={handleProceed}
                  data-testid="button-proceed"
                >
                  Proceed with Implementation →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
