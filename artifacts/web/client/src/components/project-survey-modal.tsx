import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectFeedbackSchema, type Implementation } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { localStorage } from "@/lib/services/localStorage";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

export interface ProjectSurveyModalProps {
  implementation: Implementation;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSurveyModal({
  implementation,
  isOpen,
  onClose,
}: ProjectSurveyModalProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(insertProjectFeedbackSchema),
    defaultValues: {
      implementationId: implementation.id,
      difficultyRating: 3,
      enjoymentRating: 3,
      metObjectives: [],
      learntSkills: [],
      outcomeMatches: true,
      feedbackText: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Static: localStorage-based
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implementations", implementation.id] });
      toast({
        title: "Project Completed!",
        description: "Your progress has been recorded.",
      });
      onClose();
    },
  });

  const nextStep = () => {
    if (step === 2) {
      const values = form.getValues();
      const hasSelectedObjective = (values.metObjectives || []).length > 0;
      const hasSelectedSkill = (values.learntSkills || []).length > 0;
      
      if (!hasSelectedObjective && !hasSelectedSkill) {
        toast({
          title: "Selection Required",
          description: "Please select at least one objective or skill you've learned to proceed.",
          variant: "destructive",
        });
        return;
      }
    }
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Reflection</DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? "Experience" : step === 2 ? "Objectives" : "Final Thoughts"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6 py-4">
            {step === 1 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="difficultyRating"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>How difficult was this project?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          defaultValue={field.value.toString()}
                          className="flex flex-col space-y-1"
                        >
                          {[1, 2, 3, 4, 5].map((val) => (
                            <FormItem key={val} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={val.toString()} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {val === 1 ? "Very Easy" : val === 5 ? "Very Hard" : `Level ${val}`}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enjoymentRating"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>How much did you enjoy this project?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          defaultValue={field.value.toString()}
                          className="flex flex-col space-y-1"
                        >
                          {[1, 2, 3, 4, 5].map((val) => (
                            <FormItem key={val} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={val.toString()} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {val === 1 ? "Not at all" : val === 5 ? "Loved it" : `Level ${val}`}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="metObjectives"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">Which objectives did you meet?</FormLabel>
                      <div className="grid gap-2 mt-2">
                        {implementation.expectedOutcomes?.map((outcome) => (
                          <FormField
                            key={outcome}
                            control={form.control}
                            name="metObjectives"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={(field.value as string[])?.includes(outcome)}
                                    onCheckedChange={(checked) => {
                                      const current = (field.value as string[]) || [];
                                      return checked
                                        ? field.onChange([...current, outcome])
                                        : field.onChange(current.filter((value: string) => value !== outcome));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm leading-tight">
                                  {outcome}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="learntSkills"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">What did you learn?</FormLabel>
                      <div className="grid gap-2 mt-2">
                        {implementation.learningGoals?.map((goal) => (
                          <FormField
                            key={goal}
                            control={form.control}
                            name="learntSkills"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={(field.value as string[])?.includes(goal)}
                                    onCheckedChange={(checked) => {
                                      const current = (field.value as string[]) || [];
                                      return checked
                                        ? field.onChange([...current, goal])
                                        : field.onChange(current.filter((value: string) => value !== goal));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm leading-tight">
                                  {goal}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="outcomeMatches"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Did your final outcome match the proposal?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(v) => field.onChange(v === "yes")}
                          defaultValue={field.value ? "yes" : "no"}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="yes" />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">Yes, exactly as proposed</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="no" />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">No, I made some adjustments</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feedbackText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anything else you want to note?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What was the most challenging part?"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep} size="sm">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              ) : <div />}
              
              {step < 3 ? (
                <Button type="button" onClick={nextStep} size="sm">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={mutation.isPending} 
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  onClick={(e) => {
                    const values = form.getValues();
                    const hasSelectedObjective = (values.metObjectives || []).length > 0;
                    const hasSelectedSkill = (values.learntSkills || []).length > 0;
                    const hasFeedbackText = (values.feedbackText || "").trim().length > 0;
                    
                    if (!hasSelectedObjective && !hasSelectedSkill && !hasFeedbackText) {
                      e.preventDefault();
                      toast({
                        title: "Form Required",
                        description: "Please fill out at least one field (objectives, skills, or feedback) before finishing.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {mutation.isPending ? "Saving..." : "Submit & Finish"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
