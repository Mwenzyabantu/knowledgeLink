import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GenerationProgressDialog, GenerationStep } from "@/components/generation-progress-dialog";
import { localStorage } from "@/lib/services/localStorage";
import { Zap, X } from "lucide-react";

interface GenerationStatusPageProps {
  implementationId: number;
  onComplete: (newImplementationId?: number) => void;
  onCancel: () => void;
}

export function GenerationStatusPage({
  implementationId,
  onComplete,
  onCancel,
}: GenerationStatusPageProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState(10);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { id: "gemini", label: "Analyzing project structure", status: "pending" },
    { id: "groq", label: "Enhancing implementation", status: "pending" },
    { id: "thinking", label: "Searching resources", status: "pending" },
    { id: "compile", label: "Finalizing guide", status: "pending" },
  ]);
  const [generationDetails, setGenerationDetails] = useState<{ message: string; time: string }[]>([]);

  const addDetail = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setGenerationDetails((prev) => [...prev, { message, time }]);
  };
  const [isCanceled, setIsCanceled] = useState(false);

  useEffect(() => {
    startGeneration();
  }, []);

  const startGeneration = async () => {
    try {
      // Static: simulate generation steps
      const stages = [
        { stage: 1, message: "Analyzing project structure" },
        { stage: 2, message: "Enhancing implementation" },
        { stage: 3, message: "Searching resources" },
        { stage: 4, message: "Finalizing guide" },
      ];
      for (const s of stages) {
        await new Promise((r) => setTimeout(r, 800));
        const stageMap: Record<number, string> = { 1: "gemini", 2: "groq", 3: "thinking", 4: "compile" };
        const stageId = stageMap[s.stage];
        const stageProgress = (s.stage - 1) * 25 + 10;
        setProgress(stageProgress);
        setGenerationSteps((prev) => prev.map((step) => step.id === stageId ? { ...step, status: "in-progress" } : step));
        addDetail(`-> ${s.message}`);
      }
      setProgress(100);
      onComplete(implementationId);
    } catch (error) {
      toast({ title: "Generation failed", description: "Could not generate the implementation. Please try again.", variant: "destructive" });
      onCancel();
    }
  };

  const handleCancel = () => {
    setIsCanceled(true);
    // Explicitly stop listening to SSE to prevent any further UI updates
    // and let the backend know the client disconnected
    addDetail("⊙ Generation cancelled. Redirecting...");
    toast({
      title: "Generation Cancelled",
      description: "Returning to preview...",
    });
    
    // Immediate redirection to prevent showing "Project not found" or other errors
    setTimeout(() => {
      onCancel();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-6 w-6 text-primary animate-pulse" />
            <h1 className="text-3xl font-bold">Building Your Implementation</h1>
          </div>
          <p className="text-muted-foreground">
            Our Advanced systems are analyzing and creating your project guide. Please wait...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-foreground">Overall Progress</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-generation" />
          <div className="text-xs text-muted-foreground">
            {progress < 40 && `Analyzing your project requirements...`}
            {progress >= 40 && progress < 65 && "Enhancing implementation strategy..."}
            {progress >= 65 && progress < 90 && "Fetching learning resources..."}
            {progress >= 90 && progress < 100 && "Finalizing your guide..."}
            {progress === 100 && "Ready to explore your project!"}
          </div>
        </div>

        {/* Generation Dialog */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <span className="text-primary">⚙</span> Generation Pipeline
            </h2>
            <div className="space-y-3">
              {generationSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all"
                    style={{
                      borderColor:
                        step.status === "pending"
                          ? "hsl(var(--border))"
                          : step.status === "in-progress"
                            ? "hsl(var(--primary))"
                            : "hsl(var(--primary))",
                      backgroundColor:
                        step.status === "completed"
                          ? "hsl(var(--primary))"
                          : "transparent",
                    }}
                  >
                    {step.status === "in-progress" && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                    {step.status === "completed" && (
                      <span className="text-xs text-primary-foreground font-bold">✓</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      step.status === "pending"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Details Log */}
          {generationDetails.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-semibold text-black dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00A300] animate-pulse" />
                SYSTEM ACTIVITY LOG
              </p>
              <div 
                className="space-y-1 font-mono text-[10px] flex flex-col overflow-y-auto max-h-32 p-3 rounded border border-border"
                ref={(el) => {
                  if (el) {
                    el.scrollTop = el.scrollHeight;
                  }
                }}
              >
                {generationDetails.map((entry, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="opacity-40 select-none">[{entry.time}]</span>
                    <span className="text-[#00A300] font-medium">
                      {entry.message.startsWith('→') || entry.message.startsWith('  ') ? entry.message : `> ${entry.message}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {!isCanceled && progress < 100 && (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="gap-2"
              data-testid="button-cancel-generation"
            >
              <X className="h-4 w-4" />
              Cancel Generation
            </Button>
          )}
          {isCanceled && (
            <Button
              variant="outline"
              onClick={onCancel}
              data-testid="button-go-back"
            >
              Go Back to Preview
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
