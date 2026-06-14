import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Book, Youtube, Search } from "lucide-react";

interface Prerequisite {
  id: string;
  concept: string;
  isCompleted: boolean;
  importance: "essential" | "helpful" | "optional";
}

interface LearningResource {
  type: "google" | "youtube" | "book" | "course";
  title: string;
  url: string;
}

interface KnowledgeGapAnalysisProps {
  conceptTitle: string;
  prerequisites: Prerequisite[];
  learningResources: LearningResource[];
  onPrerequisiteToggle?: (id: string) => void;
}

export function KnowledgeGapAnalysis({
  conceptTitle,
  prerequisites,
  learningResources,
  onPrerequisiteToggle,
}: KnowledgeGapAnalysisProps) {
  const [checkedPrereqs, setCheckedPrereqs] = useState<Set<string>>(
    new Set(prerequisites.filter((p) => p.isCompleted).map((p) => p.id))
  );

  useEffect(() => {
    setCheckedPrereqs(new Set(prerequisites.filter((p) => p.isCompleted).map((p) => p.id)));
  }, [prerequisites]);

  const handleToggle = (id: string) => {
    const newChecked = new Set(checkedPrereqs);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedPrereqs(newChecked);
    onPrerequisiteToggle?.(id);
  };

  const totalPrereqs = prerequisites.length;
  const completedCount = checkedPrereqs.size;
  const readinessScore = totalPrereqs > 0 ? Math.round((completedCount / totalPrereqs) * 100) : 100;

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "google":
        return <Search className="h-4 w-4" />;
      case "youtube":
        return <Youtube className="h-4 w-4" />;
      case "book":
        return <Book className="h-4 w-4" />;
      case "course":
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getImportanceBadge = (importance: string) => {
    const variants = {
      essential: "destructive",
      helpful: "default",
      optional: "secondary",
    };
    return variants[importance as keyof typeof variants] || "secondary";
  };

  return (
    <div className="border rounded-md p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Readiness Assessment</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{readinessScore}%</span>
            <span className="text-sm text-muted-foreground">ready</span>
          </div>
        </div>
        <Progress value={readinessScore} className="h-2" data-testid="readiness-progress" />
        <p className="text-sm text-muted-foreground">
          Complete these prerequisites to maximize your understanding of {conceptTitle}
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Prerequisites</h4>
        {prerequisites.map((prereq) => (
          <div
            key={prereq.id}
            className="flex items-start gap-3 p-3 rounded-md border hover-elevate"
            data-testid={`prerequisite-${prereq.id}`}
          >
            <Checkbox
              checked={checkedPrereqs.has(prereq.id)}
              onCheckedChange={() => handleToggle(prereq.id)}
              data-testid={`checkbox-prerequisite-${prereq.id}`}
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">{prereq.concept}</p>
              <Badge
                variant={getImportanceBadge(prereq.importance) as "destructive" | "default" | "secondary"}
                className="text-xs"
              >
                {prereq.importance}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {learningResources.length > 0 && (
        <div className="space-y-3 border-t pt-6">
          <h4 className="text-sm font-semibold">Learning Resources</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {learningResources.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-md border hover-elevate text-sm"
                data-testid={`resource-${index}`}
              >
                {getResourceIcon(resource.type)}
                <span className="flex-1 truncate">{resource.title}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {readinessScore < 50 && (
        <div className="border-t pt-4">
          <div className="bg-muted/50 rounded-md p-4 space-y-2">
            <p className="text-sm font-medium">Recommendation</p>
            <p className="text-sm text-muted-foreground">
              Your readiness score is below 50%. Consider reviewing the essential prerequisites
              before proceeding to ensure a stronger foundation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
