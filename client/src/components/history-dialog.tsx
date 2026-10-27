import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import type { Concept } from "@shared/schema";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConcept: (concept: string) => void;
}

export function HistoryDialog({ open, onOpenChange, onSelectConcept }: HistoryDialogProps) {
  const { data: concepts = [] } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Input History
          </DialogTitle>
          <DialogDescription>
            Click on any previous entry to reuse it in the input field
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {concepts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No previous inputs yet. Start by entering what you learned!
            </p>
          ) : (
            concepts.map((concept) => (
              <button
                key={concept.id}
                onClick={() => {
                  // Use the original user input if available, otherwise fall back to title
                  onSelectConcept(concept.originalInput || concept.title);
                  onOpenChange(false);
                }}
                className="w-full text-left p-3 rounded-md border border-border hover-elevate transition-all group"
                data-testid={`button-history-item-${concept.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {concept.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {concept.category} • {formatDistanceToNow(new Date(concept.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
