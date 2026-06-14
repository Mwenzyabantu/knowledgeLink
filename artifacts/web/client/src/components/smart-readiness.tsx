import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ArrowRight, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { localStorage } from "@/lib/services/localStorage";

interface Prerequisite {
  name: string;
  level: "essential" | "helpful" | "optional";
  learned: boolean;
}

interface Resource {
  id: number;
  title: string;
  type: "video" | "article" | "book" | "course";
  relevanceScore: number;
  url?: string;
  link?: string;
}

interface SmartReadinessProps {
  conceptTitle: string;
  conceptCategory: string;
  prerequisites: Prerequisite[];
  hasOpportunityProject: boolean;
  onClaimKnowledge?: (prerequisiteName: string) => void;
  onProceed?: () => void;
  onLearnPrerequisite?: (prerequisiteName: string) => void;
}

export function SmartReadiness({
  conceptTitle,
  conceptCategory,
  prerequisites,
  hasOpportunityProject,
  onClaimKnowledge,
  onProceed,
  onLearnPrerequisite,
}: SmartReadinessProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: masteredPrereqs = [] } = useQuery<any[]>({
    queryKey: ["/api/user-mastered-prerequisites"],
  });

  const [claimedPrereqs, setClaimedPrereqs] = useState<Set<string>>(new Set());

  // Update claimedPrereqs when masteredPrereqs or prerequisites change
  useEffect(() => {
    const initialClaimed = new Set(prerequisites.filter((p) => p.learned).map((p) => p.name));
    masteredPrereqs.forEach(m => initialClaimed.add(m.prerequisite));
    setClaimedPrereqs(initialClaimed);
  }, [masteredPrereqs, prerequisites]);

  const [selectedPrereq, setSelectedPrereq] = useState<Prerequisite | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [alreadyKnows, setAlreadyKnows] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const learned = claimedPrereqs.size;
  const total = prerequisites.length;
  const readinessScore = total > 0 ? Math.round((learned / total) * 100) : 100;

  const essentialPrereqs = prerequisites.filter((p) => p.level === "essential");
  const essentialLearned = essentialPrereqs.every((p) =>
    claimedPrereqs.has(p.name)
  );
  const missingEssential = essentialPrereqs.filter(
    (p) => !claimedPrereqs.has(p.name)
  );

  // Show ALL prerequisites, but mark claimed ones visually - don't filter them out
  const neededPrereqs = prerequisites;

  // Fetch resources for the selected prerequisite
  const { data: resources = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: selectedPrereq ? ["/api/resources", { prerequisite: selectedPrereq.name }] : [],
    queryFn: async () => {
      if (!selectedPrereq) return [];
      const params = new URLSearchParams({ prerequisite: selectedPrereq.name });
      const response = await fetch(`/api/resources?${params}`);
      if (!response.ok) throw new Error("Failed to fetch resources");
      const data = await response.json();
      return data || [];
    },
    enabled: !!selectedPrereq && openDialog,
  });

  // Calculate dynamic spectrum color from red (0%) to green (100%)
  // The spectrum is divided evenly based on number of prerequisites
  const getSpectrumColor = () => {
    // Hue ranges: Red = 0°, Yellow = 60°, Green = 120°
    // Map readinessScore (0-100) to hue (0-120)
    const hue = (readinessScore / 100) * 120;
    const saturation = 80;
    const lightness = 50;
    
    return {
      hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      border: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      bg: `hsl(${hue}, ${saturation}%, 95%)`,
      text: `hsl(${hue}, ${saturation}%, 30%)`,
      textDark: `hsl(${hue}, ${saturation}%, 70%)`,
    };
  };

  const spectrumColor = getSpectrumColor();

  const getReadinessLevel = () => {
    if (readinessScore >= 90) return "Excellent";
    if (readinessScore >= 70) return "Good";
    if (readinessScore >= 50) return "Moderate";
    return "Building";
  };

  const getCircleColor = () => {
    return {
      border: `border-2`,
      className: `relative w-14 h-14 rounded-full flex items-center justify-center`,
      style: {
        borderColor: spectrumColor.border,
        backgroundColor: spectrumColor.bg,
      },
    };
  };

  const getScoreColor = () => {
    return {
      style: {
        color: spectrumColor.text,
      },
      styleDark: {
        color: spectrumColor.textDark,
      },
    };
  };

  const getButtonColor = () => {
    return {
      style: {
        backgroundColor: spectrumColor.hsl,
        color: "white",
        border: "none",
      },
    };
  };

  const handleProceedClick = () => {
    if (!essentialLearned) {
      setShowWarning(true);
    } else {
      onProceed?.();
    }
  };

  const handleLearnClick = (prereq: Prerequisite) => {
    setSelectedPrereq(prereq);
    setAlreadyKnows(false);
    setOpenDialog(true);
  };

  const handleAlreadyKnows = () => {
    if (selectedPrereq) {
      const updated = new Set(claimedPrereqs);
      updated.add(selectedPrereq.name);
      setClaimedPrereqs(updated);
      onClaimKnowledge?.(selectedPrereq.name);
    }
  };

  const handleAlreadyKnowsClick = async (prereq: Prerequisite) => {
    setSelectedPrereq(prereq);
    const isCurrentlyClaimed = claimedPrereqs.has(prereq.name);
    
    // Optimistic update
    const updated = new Set(claimedPrereqs);
    if (isCurrentlyClaimed) {
      updated.delete(prereq.name);
    } else {
      updated.add(prereq.name);
    }
    setClaimedPrereqs(updated);

    try {
      if (!isCurrentlyClaimed) {
        // Static: localStorage-based
        const prefs = localStorage.prefs.get();
        localStorage.prefs.set({
          ...prefs,
          personalization: {
            ...(prefs.personalization || {}),
            masteredPrerequisites: [...(prefs.personalization?.masteredPrerequisites || []), prereq.name],
          },
        });
        onClaimKnowledge?.(prereq.name);
      } else {
        // Delete not implemented yet, but we update local state
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user-mastered-prerequisites"] });
    } catch (err) {
      console.error("Failed to update mastered prerequisite:", err);
      // Revert on error
      setClaimedPrereqs(claimedPrereqs);
    }
  };

  const handleGoToResources = () => {
    if (selectedPrereq) {
      setLocation(`/resources?query=${encodeURIComponent(selectedPrereq.name)}`);
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300";
      case "article":
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300";
      case "book":
        return "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300";
      case "course":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300";
      default:
        return "bg-gray-50 dark:bg-gray-950/20 text-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Section: Compact readiness status */}
      <div className="flex gap-6 items-start pb-4">
        {/* Text - flex-1 to take available space */}
        <div className="flex-1">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">How Ready Are You?</h3>
            <p className="text-xs text-muted-foreground">
              You have {learned} of {total} foundational concepts
            </p>
            <p className="text-xs text-muted-foreground">
              {prerequisites.length - claimedPrereqs.size > 0
                ? `You'll learn the other ${prerequisites.length - claimedPrereqs.size} new ${prerequisites.length - claimedPrereqs.size === 1 ? "concept" : "concepts"} in this project`
                : "You have all the foundations needed"}
            </p>
          </div>
        </div>

        {/* Circular gauge - on the right */}
        <div className="flex-shrink-0">
          <div
            className="relative w-14 h-14 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: spectrumColor.border,
              backgroundColor: spectrumColor.bg,
            }}
          >
            <div className="text-center">
              <div
                className="text-sm font-light"
                style={{
                  color: spectrumColor.text,
                }}
              >
                {readinessScore}%
              </div>
              <div
                className="text-xs font-medium"
                style={{
                  color: spectrumColor.text,
                }}
              >
                {getReadinessLevel()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prerequisites Section - show all neededPrereqs but mark claimed ones visually */}
      {neededPrereqs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What You Need
          </h4>
          <div className="space-y-2">
            {neededPrereqs.map((prereq, index) => (
              <div
                key={`${prereq.name}-${index}`}
                className="flex items-center justify-between gap-2 p-2 rounded-md border border-border hover:bg-muted/50 transition-colors text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{prereq.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {prereq.level === "essential"
                      ? "Essential"
                      : prereq.level === "helpful"
                      ? "Helpful"
                      : "Optional"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleLearnClick(prereq)}
                    className="text-xs h-7 px-2"
                    data-testid={`button-learn-${prereq.name}`}
                  >
                    Learn
                  </Button>
                  <button
                    onClick={() => handleAlreadyKnowsClick(prereq)}
                    className="flex items-center gap-1.5 hover-elevate p-1 rounded"
                    data-testid={`button-already-know-${prereq.name}`}
                  >
                    <div className="w-4 h-4 border border-border rounded flex items-center justify-center hover:bg-muted/50 transition-colors">
                      {claimedPrereqs.has(prereq.name) && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">I already know this</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for Essential Prerequisites */}
      {missingEssential.length > 0 && (
        <div className="flex gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs">
          <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-amber-900 dark:text-amber-200">
            You're missing {missingEssential.length} essential{" "}
            {missingEssential.length === 1 ? "concept" : "concepts"}. You can proceed
            anyway.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-8"
          data-testid="button-hide-readiness"
        >
          Hide
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8"
          data-testid="button-generate-new"
        >
          Generate New Project
        </Button>
        <Button
          size="sm"
          onClick={handleProceedClick}
          className="text-xs h-8 text-white"
          style={{
            backgroundColor: spectrumColor.hsl,
            borderColor: spectrumColor.hsl,
          }}
          data-testid="button-proceed-project"
        >
          Proceed to Project
        </Button>
      </div>

      {/* Learn Resources Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-sm">Learn {selectedPrereq?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Explore resources to master this concept
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {resourcesLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  Searching for learning resources...
                </p>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                {/* Resources List */}
                {resources.length > 0 ? (
                  <div className="space-y-2">
                    {resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-2 rounded-md border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate text-primary hover:underline">{resource.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${getResourceTypeColor(
                                resource.type
                              )}`}
                            >
                              {resource.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(resource.relevanceScore * 100)}% match
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">No resources found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom */}
          {!resourcesLoading && (
            <div className="flex gap-2 pt-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToResources}
                className="flex-1 text-xs h-8"
                data-testid="button-view-all-resources"
              >
                View All Resources <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-sm">Missing Essential Prerequisites</DialogTitle>
            <DialogDescription className="text-xs">
              You haven't learned all essentials. This might be challenging, but you
              can proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-4">
            <div className="text-xs space-y-1">
              <p className="font-medium">Missing:</p>
              <ul className="space-y-0.5 ml-4">
                {missingEssential.map((p) => (
                  <li key={p.name} className="text-muted-foreground">
                    • {p.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWarning(false)}
              className="flex-1 text-xs h-8"
            >
              Learn First
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowWarning(false);
                onProceed?.();
              }}
              className="flex-1 text-xs h-8"
              data-testid="button-proceed-anyway"
            >
              Proceed Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
