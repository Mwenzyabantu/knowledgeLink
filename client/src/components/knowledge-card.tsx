import { useState } from "react";
import { ChevronDown, ChevronUp, Code, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface KnowledgeCardProps {
  title: string;
  description: string;
  category: string;
  applications: string[];
  pseudocode?: string;
  relatedConcepts: string[];
  timestamp: string;
}

export function KnowledgeCard({
  title,
  description,
  category,
  applications,
  pseudocode,
  relatedConcepts,
  timestamp,
}: KnowledgeCardProps) {
  const [showPseudocode, setShowPseudocode] = useState(false);
  const [showApplications, setShowApplications] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold mb-2">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary" data-testid={`badge-category-${category.toLowerCase()}`}>
            {category}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {relatedConcepts.map((concept, index) => (
            <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-related-${index}`}>
              <Network className="mr-1 h-3 w-3" />
              {concept}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible open={showApplications} onOpenChange={setShowApplications}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-applications">
              Real-World Applications
              {showApplications ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <ul className="space-y-2 pl-6">
              {applications.map((app, index) => (
                <li key={index} className="text-sm list-disc" data-testid={`text-application-${index}`}>
                  {app}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        {pseudocode && (
          <Collapsible open={showPseudocode} onOpenChange={setShowPseudocode}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-pseudocode">
                <span className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Show Pseudocode
                </span>
                {showPseudocode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="bg-muted rounded-lg p-4">
                <pre className="text-sm font-mono overflow-x-auto" data-testid="text-pseudocode">
                  <code>{pseudocode}</code>
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground" data-testid="text-timestamp">
            {timestamp}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
