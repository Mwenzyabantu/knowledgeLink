import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface GenerationProgressDialogProps {
  open: boolean;
  steps: GenerationStep[];
  currentStep?: string;
  details?: string[];
}

export function GenerationProgressDialog({
  open,
  steps,
  currentStep,
  details = [],
}: GenerationProgressDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generating Your Implementation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2"
                     style={{
                       borderColor: step.status === 'pending' ? '#ccc' : 
                                   step.status === 'in-progress' ? 'hsl(var(--primary))' :
                                   'hsl(var(--primary))',
                       backgroundColor: step.status === 'completed' ? 'hsl(var(--primary))' : 'transparent'
                     }}>
                  {step.status === 'in-progress' && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  )}
                  {step.status === 'completed' && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  step.status === 'pending' && "text-muted-foreground",
                  step.status === 'in-progress' && "text-foreground",
                  step.status === 'completed' && "text-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {details.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Progress Details:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {details.map((detail, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                    • {detail}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-center">
          Three Advanced Algorithms working together for quality...
        </div>
      </DialogContent>
    </Dialog>
  );
}
