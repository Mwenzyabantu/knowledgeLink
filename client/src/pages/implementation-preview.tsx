import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { GenerationStatusPage } from "@/components/generation-status-page";
import type { Implementation, OpportunityProject } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ImplementationPreview() {
  const [, params] = useRoute("/implementation/preview/:conceptId");
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShowingStatusPage, setIsShowingStatusPage] = useState(false);
  const { toast } = useToast();

  const conceptId = params?.conceptId ? parseInt(params.conceptId) : null;

  // Fetch the project details first
  const { data: project, isLoading: isLoadingProject } = useQuery<OpportunityProject>({
    queryKey: [`/api/opportunity-projects/${conceptId}`],
    enabled: !!conceptId,
  });

  // Fetch or create the implementation preview
  const { data: implementation, isLoading: isLoadingImplementation, refetch } = useQuery<Implementation>({
    queryKey: [`/api/opportunity-projects/${conceptId}/implementation-preview`],
    enabled: !!conceptId && !!project,
  });

  const handleGenerateNew = () => {
    setIsGenerating(true);
    // Logic to trigger a new implementation would go here
    setTimeout(() => {
      setIsGenerating(false);
      refetch();
    }, 1500);
  };

  const handleProceed = () => {
    if (implementation) {
      setIsShowingStatusPage(true);
    } else {
      toast({
        title: "Generating Implementation",
        description: "Please wait while we prepare the initial preview.",
      });
    }
  };

  const handleGenerationComplete = () => {
    if (implementation) {
      setLocation(`/implementation/${implementation.id}`);
    }
  };

  const handleCancel = () => {
    setIsShowingStatusPage(false);
  };

  const handleGoBack = () => {
    setIsShowingStatusPage(false);
  };

  if (isLoadingProject || isLoadingImplementation) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isShowingStatusPage && implementation) {
    return (
      <GenerationStatusPage
        implementationId={implementation.id}
        onComplete={handleGenerationComplete}
        onCancel={handleGoBack}
      />
    );
  }

  const displayProject = implementation || {
    projectName: project?.title || "Loading...",
    type: project?.difficulty || "unknown",
    components: project?.skills || [],
    learningGoals: project?.summary ? [project.summary] : [],
  };

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

          {isGenerating ? (
            <div className="border-l-2 border-primary pl-4 py-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">Generating alternative implementation...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-l-2 border-primary pl-4 py-4">
                <h2 className="text-xl font-semibold mb-1">{displayProject.projectName}</h2>
                <p className="text-sm text-muted-foreground">{displayProject.type}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Components</h3>
                <ul className="space-y-2">
                  {(displayProject.components || []).map((component: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{component}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Learning Goals</h3>
                <ul className="space-y-2">
                  {(displayProject.learningGoals || []).map((goal: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 flex-wrap pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleGenerateNew}
                  data-testid="button-generate-new"
                >
                  Generate New Implementation
                </Button>
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
