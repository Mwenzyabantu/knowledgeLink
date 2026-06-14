import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightPattern {
  pattern: string;
  insight: string;
}

interface SubjectStat {
  subject: string;
  count: number;
  percent: number;
}

interface InsightsData {
  patterns: InsightPattern[];
  suggestions: string[];
  subjectDistribution: SubjectStat[];
}

export default function Insights() {
  const queryClient = useQueryClient();

  // Scroll to top on mount
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  const { data: insights, isLoading, error } = useQuery<InsightsData>({
    queryKey: ["/api/insights/profile"],
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <p className="text-muted-foreground">Failed to load learning insights. Please try again.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/insights/profile"] })}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <h1 className="text-2xl font-semibold mb-1">Learning Insights</h1>
        <p className="text-sm text-muted-foreground">
          Understand your learning patterns and problem-solving approach
        </p>
      </div>

      <div className="space-y-8 py-4">
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Learning Profile</h2>
          <div className="space-y-6">
            {insights.patterns.map((item, index) => (
              <div key={index} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium text-sm mb-1">{item.pattern}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-8">
          <h2 className="text-lg font-semibold mb-4">Personalized Suggestions</h2>
          <ul className="space-y-3">
            {insights.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="text-primary mt-0.5">→</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {insights.subjectDistribution.length > 0 && (
          <div className="border-t pt-8">
            <h2 className="text-lg font-semibold mb-4">Subject Distribution</h2>
            <div className="space-y-4">
              {insights.subjectDistribution.map((item) => (
                <div key={item.subject}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-medium">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">{item.count} concepts</span>
                  </div>
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
