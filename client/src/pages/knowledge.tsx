import { KnowledgeDetail } from "@/components/knowledge-detail";
import { Input } from "@/components/ui/input";
import { Search, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollableTabs } from "@/components/scrollable-tabs";
import { useQuery } from "@tanstack/react-query";
import type { Concept } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState, useMemo, useEffect, useContext } from "react";
import { AuthContext } from "@/hooks/use-auth";

export default function Knowledge() {
  const authContext = useContext(AuthContext);
  const { user } = authContext || { user: null };
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [navigationConceptId, setNavigationConceptId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      // Decode and lowercase to match tab values
      setActiveTab(decodeURIComponent(tab).toLowerCase());
    }
  }, []);

  // Special case: scroll to specific concept when coming from dashboard dialogs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conceptId = params.get("conceptId");
    if (conceptId) {
      setNavigationConceptId(conceptId);
      setSearchQuery(""); // Clear search to ensure concept is visible
      setTimeout(() => {
        const element = document.querySelector(`[data-concept-id="${conceptId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);

  const { data: concepts = [], isLoading } = useQuery<Concept[]>({
    queryKey: ["/api/concepts"],
    enabled: !!user,
  });

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    concepts.forEach((concept) => {
      if (concept.tags) {
        concept.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [concepts]);

  const filteredConcepts = useMemo(() => {
    if (!searchQuery.trim()) return concepts;
    const query = searchQuery.toLowerCase();
    return concepts.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.problem.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        (c.tags && c.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  }, [concepts, searchQuery]);

  const categories = useMemo(() => {
    return Array.from(new Set(concepts.map((c) => c.category)));
  }, [concepts]);

  const renderConcepts = (conceptsList: Concept[]) => {
    if (isLoading) {
      return <p className="text-sm text-muted-foreground py-6">Loading concepts...</p>;
    }
    if (conceptsList.length === 0) {
      return <p className="text-sm text-muted-foreground py-6">No concepts found.</p>;
    }
    return conceptsList.map((concept) => (
      <div key={concept.id} data-concept-id={concept.id}>
        <KnowledgeDetail
          id={concept.id}
          title={concept.title}
          category={concept.category}
          problem={concept.problem}
          what={concept.what}
          why={concept.why}
          how={concept.how}
          where={concept.where}
          who={concept.who}
          when={concept.when}
          pseudocode={concept.pseudocode || undefined}
          tags={concept.tags || undefined}
          isFavorite={concept.isFavorite || undefined}
          timestamp={formatDistanceToNow(new Date(concept.createdAt), { addSuffix: true })}
          defaultCollapsed={concept.id.toString() !== navigationConceptId}
          persistCollapsedState={false}
        />
      </div>
    ));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">
              Concepts organized by problems they solve
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by problem, concept, or tag..."
            className="pl-6 border-0 border-b rounded-none focus-visible:ring-0 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {allTags.slice(0, 10).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover-elevate text-xs"
                onClick={() => setSearchQuery(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
        <div className="border-b">
          <ScrollableTabs>
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="all" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap gap-2" data-testid="tab-all">
                All
                <Badge variant="secondary" className="text-xs">{filteredConcepts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap gap-2" data-testid="tab-favorites">
                <Star className="h-3 w-3" />
                Favorites
                <Badge variant="secondary" className="text-xs">{filteredConcepts.filter((c) => c.isFavorite).length}</Badge>
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category.toLowerCase()}
                  className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap gap-2"
                  data-testid={`tab-${category.toLowerCase()}`}
                >
                  {category}
                  <Badge variant="secondary" className="text-xs">{filteredConcepts.filter((c) => c.category === category).length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollableTabs>
        </div>

        <TabsContent value="all" className="mt-0">
          {renderConcepts(filteredConcepts)}
        </TabsContent>

        <TabsContent value="favorites" className="mt-0">
          {renderConcepts(filteredConcepts.filter((c) => c.isFavorite))}
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category.toLowerCase()} className="mt-0">
            {renderConcepts(filteredConcepts.filter((c) => c.category === category))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
