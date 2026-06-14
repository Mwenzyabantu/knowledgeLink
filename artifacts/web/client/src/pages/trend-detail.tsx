import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Trend {
  id: number;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  imageUrl?: string;
  imageDescription?: string;
  relevanceToUser: string;
  relatedConcepts: string[];
  category: string;
  publishedAt: string;
  readByUser: boolean;
  userRating?: number;
}

export default function TrendDetail() {
  const [, params] = useRoute("/trends/:id");
  const [, setLocation] = useLocation();

  const trendId = params?.id ? parseInt(params.id) : null;

  const { data: trends = [], isLoading: isTrendsLoading } = useQuery<Trend[]>({
    queryKey: ["/api/trends"],
  });

  const trend = trends.find(t => t.id === trendId);
  const isLoading = isTrendsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trend) {
    return (
      <div className="max-w-4xl mx-auto py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/trends")}
          className="mb-4"
          data-testid="button-back-to-trends"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trends
        </Button>
        <p className="text-sm text-muted-foreground">Trend not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/trends")}
          className="mb-6"
          data-testid="button-back-to-trends"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trends
        </Button>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 flex-wrap">
            {trend.category.split(/[&,]/).map((cat, idx) => (
              <Badge key={idx} variant="secondary" className="capitalize">
                {cat.trim()}
              </Badge>
            ))}
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(trend.publishedAt), { addSuffix: true })}
            </span>
            {trend.source === "internet_fetched" && trend.sourceUrl && (
              <a
                href={trend.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                data-testid="link-external-source"
              >
                View Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-2">{trend.title}</h1>

          {trend.imageUrl && (
            <div className="w-full aspect-video rounded-lg overflow-hidden my-6 border bg-muted flex items-center justify-center">
              <img 
                src={trend.imageUrl} 
                alt={trend.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200";
                }}
              />
            </div>
          )}

          <div className="border-l-2 border-primary pl-4 py-2 my-6 bg-primary/5 rounded-r-lg">
            <p className="text-sm font-semibold mb-1 text-primary">Observer's Log</p>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              {trend.relevanceToUser}
            </p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none mb-12">
          <div className="whitespace-pre-line text-lg leading-relaxed text-foreground/90">
            {trend.content}
          </div>
        </div>

        {trend.relatedConcepts.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Connections</h2>
            <div className="flex gap-2 flex-wrap">
              {trend.relatedConcepts.map((concept, index) => (
                <Badge key={index} variant="outline" data-testid={`related-concept-${index}`}>
                  {concept}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Evolutionary Steps</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-primary mt-0.5">→</span>
              <span>Watch how this trend ripples through your current focus</span>
            </li>
            <li className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-primary mt-0.5">→</span>
              <span>Experiment with these emerging tools in your next project</span>
            </li>
            <li className="flex items-start gap-2 text-sm leading-relaxed">
              <span className="text-primary mt-0.5">→</span>
              <span>Keep an eye on these shifts as your understanding matures</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
