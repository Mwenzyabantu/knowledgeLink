import { useQuery } from "@tanstack/react-query";
import type { Resource } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, BookOpen, Youtube, FileText, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabs } from "@/components/scrollable-tabs";
import { useState, useMemo } from "react";

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const filteredResources = useMemo(() => {
    return resources.filter((r: any) => {
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeTab === "all" || r.type === activeTab;
      return matchesSearch && matchesType;
    });
  }, [resources, searchQuery, activeTab]);

  const typeCounts = useMemo(() => {
    const counts: { [key: string]: number } = { all: resources.length };
    resources.forEach((r: any) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Youtube className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "book":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Learning Resources</h1>
            <p className="text-sm text-muted-foreground">
              Curated resources for your learning journey
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search resources..."
            className="pl-6 border-0 border-b rounded-none focus-visible:ring-0 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-resources"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
        <div className="border-b">
          <ScrollableTabs>
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="all" 
                className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap flex items-center gap-2" 
                data-testid="tab-all"
              >
                All
                <Badge variant="outline" className="text-xs">
                  {typeCounts.all}
                </Badge>
              </TabsTrigger>
              {["video", "article", "book", "course"].map((type) => (
                <TabsTrigger 
                  key={type}
                  value={type} 
                  className="rounded-none text-sm data-[state=active]:border-b-2 data-[state=active]:border-primary whitespace-nowrap flex items-center gap-2" 
                  data-testid={`tab-${type}`}
                >
                  <div className="flex items-center gap-1">
                    {getTypeIcon(type)}
                    <span className="capitalize">{type}</span>
                  </div>
                  {(typeCounts[type] ?? 0) > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {typeCounts[type]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollableTabs>
        </div>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {filteredResources.length > 0 ? (
            <div className="grid gap-3">
              {filteredResources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border rounded-md hover-elevate space-y-2 group"
                  data-testid={`resource-card-${idx}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm group-hover:text-primary">
                        {resource.title}
                      </p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {resource.source}
                    </Badge>
                    {resource.relevanceScore && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(resource.relevanceScore)}% relevant
                      </Badge>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {resources.length === 0 
                  ? "No resources found. Try learning new concepts to discover resources." 
                  : "No resources match your search. Try adjusting your filters."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
