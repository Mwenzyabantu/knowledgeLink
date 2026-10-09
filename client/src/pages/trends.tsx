import { AuthContext } from "@/hooks/use-auth";
import { useState, useMemo, useEffect, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search, TrendingUp, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { safeHttpUrl } from "@shared/safe-url";

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

interface ConceptSummary {
  id: number;
  title: string;
}

export default function Trends() {
  const authContext = useContext(AuthContext);
  const { user } = authContext || { user: null };
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
  const {
    data: trendsData,
    isLoading,
    isError,
    refetch: refetchTrends,
  } = useQuery<Trend[]>({
    queryKey: ["/api/trends"],
    enabled: !!user,
  });

  const {
    data: conceptsData = [],
    isLoading: isConceptsLoading,
    isError: isConceptsError,
    refetch: refetchConcepts,
  } = useQuery<ConceptSummary[]>({
    queryKey: ["/api/concepts"],
    enabled: !!user,
  });

  const trends = trendsData || [];
  const concepts = conceptsData;

  // Mutation for generating trends
  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/trends/generate", {});
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

  const mockTrends: Trend[] = [
    {
      id: 1,
      title: "Machine Learning Applications in Physics Simulations Trending +23%",
      content: "Recent advances in machine learning have revolutionized how we approach physics simulations. Neural networks are now being used to predict complex molecular dynamics, optimize control systems, and even solve partial differential equations faster than traditional numerical methods...",
      source: "ai_generated",
      relevanceToUser: "Based on your recent study of Newton's Laws and forces, this trend shows how modern AI is being applied to physics problems you're learning about.",
      relatedConcepts: ["Forces", "Newton's Third Law"],
      category: "Physics",
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      readByUser: false,
    },
    {
      id: 2,
      title: "Quantum Computing Breakthroughs in Chemical Bonding Analysis",
      content: "IBM and Google have announced new quantum algorithms that can accurately predict chemical bonding patterns in complex molecules. This development could accelerate drug discovery and materials science research by several orders of magnitude...",
      source: "internet_fetched",
      sourceUrl: "https://example.com/quantum-chemistry",
      relevanceToUser: "Connects to your understanding of chemical bonding and shows cutting-edge applications in computational chemistry.",
      relatedConcepts: ["Chemical Bonding"],
      category: "Chemistry",
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      readByUser: false,
    },
    {
      id: 3,
      title: "Photosynthesis Efficiency Improvements in Bioengineering",
      content: "Scientists at MIT have successfully engineered plants with 40% improved photosynthesis efficiency by modifying key enzymes in the Calvin cycle. This breakthrough could revolutionize agriculture and carbon capture technologies...",
      source: "internet_fetched",
      sourceUrl: "https://example.com/photosynthesis-breakthrough",
      relevanceToUser: "Directly relates to your recent study of photosynthesis and shows real-world applications in solving climate change.",
      relatedConcepts: ["Photosynthesis"],
      category: "Biology",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      readByUser: true,
    },
    {
      id: 4,
      title: "New Mathematical Framework for Supply Chain Optimization",
      content: "Researchers have developed a novel mathematical approach combining graph theory and optimization algorithms to solve supply chain problems. Major retailers are already implementing these methods to reduce costs by 15-20%...",
      source: "ai_generated",
      relevanceToUser: "Builds on your understanding of supply and demand with practical mathematical applications in economics.",
      relatedConcepts: ["Supply and Demand"],
      category: "Mathematics",
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      readByUser: false,
    },
    {
      id: 5,
      title: "AI-Powered Theorem Proving Assists Mathematicians",
      content: "OpenAI's latest research shows AI systems can now assist in mathematical theorem proving, recently helping discover new proofs for classic problems. The Pythagorean theorem applications are being explored in modern geometric deep learning...",
      source: "internet_fetched",
      sourceUrl: "https://example.com/ai-math-proofs",
      relevanceToUser: "Connects to your study of the Pythagorean theorem and shows how AI is advancing mathematical research.",
      relatedConcepts: ["Pythagorean Theorem"],
      category: "Mathematics",
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      readByUser: false,
    },
  ];

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
            disabled={
              generateMutation.isPending ||
              isLoading ||
              isConceptsLoading ||
              isConceptsError ||
              concepts.length === 0
            }
            data-testid="button-generate-trends"
            title={concepts.length === 0 ? "Add a concept before generating trends" : undefined}
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
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              Trends couldn’t be loaded. Try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetchTrends();
                void refetchConcepts();
              }}
            >
              Try again
            </Button>
          </div>
        ) : filteredTrends.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            {searchQuery || selectedCategory
              ? "No trends match your search or category."
              : isConceptsLoading
                ? "Checking your learned concepts..."
                : isConceptsError
                  ? "Your concepts couldn’t be loaded, so new trends can’t be generated yet."
                  : concepts.length === 0
                    ? "Add a concept to your knowledge base before generating learning trends."
                    : "No trends yet. Select Generate Trends to create articles from your learned concepts."}
          </p>
        ) : (
          filteredTrends.map((trend) => {
            const sourceUrl = safeHttpUrl(trend.sourceUrl);
            return (
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
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      aria-label={`Read original source for ${trend.title}`}
                      data-testid={`link-trend-source-${trend.id}`}
                    >
                      Read source
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  )}
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
            );
          })
        )}
      </div>
    </div>
  );
}
