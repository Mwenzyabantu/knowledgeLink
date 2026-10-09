import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TimelineItem {
  id: string;
  title: string;
  category: string;
  date: string;
  connections: number;
}

interface TimelineViewProps {
  items: TimelineItem[];
}

export function TimelineView({ items }: TimelineViewProps) {
  return (
    <div className="space-y-6">
      {items.map((item, index) => (
        <div key={item.id} className="relative">
          {index !== items.length - 1 && (
            <div className="absolute left-[19px] top-12 bottom-0 w-[2px] bg-border" />
          )}
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {index + 1}
              </div>
            </div>
            <Card className="flex-1">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1" data-testid={`text-timeline-title-${index}`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.date}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" data-testid={`badge-timeline-category-${index}`}>
                        {item.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.connections} connections
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
}
