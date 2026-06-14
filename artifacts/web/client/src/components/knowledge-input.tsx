import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeDetail } from "./knowledge-detail";
import { formatDistanceToNow } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localStorage } from "@/lib/services/localStorage";
import { generate5WH } from "@/lib/services/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAutoHeightTextarea } from "@/hooks/use-auto-height-textarea";
import type { Concept } from "@shared/schema";

export function KnowledgeInput() {
  const [concept, setConcept] = useState("");
  const [generatedConcept, setGeneratedConcept] = useState<Concept | null>(null);
  const textareaRef = useAutoHeightTextarea(concept, 120);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submitConceptMutation = useMutation({
    mutationFn: async (userInput: string) => {
      const fiveWH = await generate5WH(userInput);
      const conceptData = {
        ...fiveWH,
        tags: [],
        isFavorite: false,
      };
      const created = localStorage.concepts.add(conceptData);
      return created as unknown as Concept;
    },
    onSuccess: (newConcept: Concept) => {
      queryClient.invalidateQueries({ queryKey: ["/api/concepts"] });
      setGeneratedConcept(newConcept);
      setConcept("");
      toast({
        title: "Concept created!",
        description: `"${newConcept.title}" has been added to your knowledge base.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create concept. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!concept.trim()) return;
    submitConceptMutation.mutate(concept);
  };

  const handleNewConcept = () => {
    setConcept("");
    setGeneratedConcept(null);
  };

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">What did you learn today?</h2>
              <p className="text-sm text-muted-foreground">
                Share a concept or knowledge you're curious about, and I'll help you understand its real-world applications.
              </p>
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="E.g., I learned about Newton's Third Law of Motion in physics class..."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="resize-none"
              style={{ minHeight: '120px', overflow: 'hidden' }}
              data-testid="input-concept"
            />
            <div className="flex gap-2">
              {generatedConcept && (
                <Button
                  variant="ghost"
                  onClick={handleNewConcept}
                  className="flex-1"
                  data-testid="button-new-concept"
                >
                  New Concept
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!concept.trim() || submitConceptMutation.isPending}
                className={generatedConcept ? "flex-1" : "w-full"}
                data-testid="button-submit-concept"
              >
                {submitConceptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Explore with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {generatedConcept && (
        <div className="mt-8">
          <KnowledgeDetail
            id={generatedConcept.id}
            title={generatedConcept.title}
            category={generatedConcept.category}
            problem={generatedConcept.problem}
            what={generatedConcept.what}
            why={generatedConcept.why}
            how={generatedConcept.how}
            where={generatedConcept.where}
            who={generatedConcept.who}
            when={generatedConcept.when}
            pseudocode={generatedConcept.pseudocode || undefined}
            tags={generatedConcept.tags || undefined}
            isFavorite={generatedConcept.isFavorite || undefined}
            timestamp={formatDistanceToNow(new Date(generatedConcept.createdAt), { addSuffix: true })}
          />
        </div>
      )}
    </div>
  );
}
