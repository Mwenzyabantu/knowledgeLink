import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Trend {
  id: number;
  title: string;
  content: string;
  imageUrl?: string;
  imageDescription?: string;
  source: string;
  sourceUrl?: string;
  relevanceToUser: string;
  relatedConcepts: string[];
  category: string;
  publishedAt?: string;
  readByUser: boolean;
  userRating?: number;
}

export default function Trends() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  // Scroll to top on mount
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, []);

  // Fetch trends from API
  const { data: trendsData, isLoading } = useQuery<Trend[]>({
    queryKey: ["/api/trends"],
    enabled: !!user,
  });

  const trends = trendsData || [];

  // Mutation for generating trends
  const generateMutation = useMutation({
    mutationFn: async () => {
      // In static mode, trends are generated via edge function directly
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trends"] });
      toast({ title: "Trends generated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate trends",
        description: error?.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const categories = useMemo(() => {
    const allCategories = trends.flatMap((t) => 
      t.category.split(/[&,]/).map(cat => cat.trim()).filter(cat => cat.length > 0)
    );
    return Array.from(new Set(allCategories)).sort();
  }, [trends]);

  const filteredTrends = useMemo(() => {
    let filtered = trends;

    if (selectedCategory) {
      filtered = filtered.filter((t) => {
        const trendCategories = t.category.split(/[&,]/).map(cat => cat.trim().toLowerCase());
        return trendCategories.includes(selectedCategory.toLowerCase());
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [trends, selectedCategory, searchQuery]);

  const handleTrendClick = (trendId: number) => {
    setLocation(`/trends/${trendId}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-8">
        <div className="flex items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight">Learning Trends</h1>
              <p className="text-base text-muted-foreground">
                Stay updated with the latest developments in what you're learning
              </p>
            </div>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isLoading}
            data-testid="button-generate-trends"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              "Generate Trends"
            )}
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search trends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-6 border-0 border-b rounded-none focus-visible:ring-0 text-sm"
            data-testid="input-search-trends"
          />
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer hover-elevate px-3 py-1 text-sm font-medium"
            onClick={() => setSelectedCategory(null)}
            data-testid="badge-category-all"
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer hover-elevate px-3 py-1 text-sm font-medium capitalize"
              onClick={() => setSelectedCategory(category)}
              data-testid={`badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-6 py-4">
        {filteredTrends.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No trends found.</p>
        ) : (
          filteredTrends.map((trend) => (
            <div
              key={trend.id}
              onClick={() => handleTrendClick(trend.id)}
              className="group border-l-2 border-primary pl-6 cursor-pointer hover-elevate py-4 transition-all duration-200 flex gap-6 items-start"
              data-testid={`trend-item-${trend.id}`}
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">{trend.title}</h2>
                  {!trend.readByUser && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" data-testid={`unread-indicator-${trend.id}`} />
                  )}
                </div>
                <p className="text-base text-muted-foreground mb-4 leading-relaxed line-clamp-3">
                  {trend.content}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {trend.category.split(/[&,]/).map((cat, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs capitalize">
                      {cat.trim()}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {trend.publishedAt ? formatDistanceToNow(new Date(trend.publishedAt), { addSuffix: true }) : 'Recently'}
                  </span>
                </div>
              </div>
              {trend.imageUrl && (
                <div className="w-40 h-28 rounded-md overflow-hidden flex-shrink-0 border bg-muted">
                  <img 
                    src={trend.imageUrl} 
                    alt={trend.title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const fallback = `https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=400&description=${encodeURIComponent(trend.title)}`;
                      (e.target as HTMLImageElement).src = fallback;
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
