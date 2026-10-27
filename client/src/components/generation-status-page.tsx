import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GenerationProgressDialog, GenerationStep } from "@/components/generation-progress-dialog";
import { apiRequest } from "@/lib/queryClient";
import { Zap, X } from "lucide-react";

interface GenerationStatusPageProps {
  implementationId: number;
  onComplete: () => void;
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
  const [generationDetails, setGenerationDetails] = useState<string[]>([]);
  const [isCanceled, setIsCanceled] = useState(false);

  useEffect(() => {
    startGeneration();
  }, []);

  const startGeneration = async () => {
    try {
      // Call generation endpoint
      const res = await apiRequest(
        "POST",
        `/api/implementations/${implementationId}/generate`,
        {}
      );
      const { generationId: genId } = await res.json();

      if (!genId) {
        throw new Error("No generation ID received");
      }

      setGenerationId(genId);

      // Give server a moment to prepare SSE endpoint
      await new Promise((resolve) => setTimeout(resolve, 200));

      // connect to SSE stream for real-time progress
      // (Mocked for now since SSE endpoint is not fully implemented)
      let mockProgress = 10;
      const interval = setInterval(() => {
        mockProgress += 5;
        setProgress(mockProgress);
        
        if (mockProgress >= 25) setGenerationSteps(prev => prev.map(s => s.id === "gemini" ? { ...s, status: "completed" } : s.id === "groq" ? { ...s, status: "in-progress" } : s));
        if (mockProgress >= 50) setGenerationSteps(prev => prev.map(s => s.id === "groq" ? { ...s, status: "completed" } : s.id === "thinking" ? { ...s, status: "in-progress" } : s));
        if (mockProgress >= 75) setGenerationSteps(prev => prev.map(s => s.id === "thinking" ? { ...s, status: "completed" } : s.id === "compile" ? { ...s, status: "in-progress" } : s));
        
        if (mockProgress >= 100) {
          clearInterval(interval);
          setGenerationSteps(prev => prev.map(s => ({ ...s, status: "completed" })));
          setGenerationDetails(prev => [...prev, "✓ Implementation guide ready!"]);
          toast({
            title: "Success!",
            description: "Your implementation guide has been generated.",
            duration: 3000,
          });
          setTimeout(() => onComplete(), 1500);
        }
      }, 500);

      return () => clearInterval(interval);
    } catch (error) {
      console.error("Generation failed:", error);
      setGenerationDetails((prev) => [
        ...prev,
        "✗ Generation failed. Please try again.",
      ]);
      toast({
        title: "Error",
        description: "Failed to start generation",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsCanceled(true);
    setGenerationDetails((prev) => [
      ...prev,
      "⊙ Generation cancelled. You can go back now.",
    ]);
    toast({
      title: "Generation Cancelled",
      description: "You can go back to the previous page.",
    });
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
            <div className="border-t pt-4 space-y-2 max-h-48">
              <p className="text-xs font-semibold text-muted-foreground">Activity Log (Recent First):</p>
              <div className="space-y-1 font-mono text-xs flex flex-col-reverse overflow-y-auto max-h-32">
                {generationDetails.slice(-5).reverse().map((detail, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    {detail}
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
