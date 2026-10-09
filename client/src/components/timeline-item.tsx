import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface TimelineItemProps {
  title: string;
  category: string;
  date: string;
  lastAccessedDate: string;
  isLast?: boolean;
  conceptId?: number;
  isFavorite?: boolean | null;
}

export function TimelineItem({ title, category, date, lastAccessedDate, isLast, conceptId, isFavorite }: TimelineItemProps) {
  const [, setLocation] = useLocation();

  const handleViewClick = () => {
    if (conceptId) {
      const encodedCategory = encodeURIComponent(category);
      setLocation(`/knowledge?tab=${encodedCategory}&conceptId=${conceptId}`);
    }
  };

  return (
    <div className="flex gap-4 pb-6">
      <div className="flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1" />
        {!isLast && <div className="flex-1 w-px bg-border mt-2" />}
      </div>
      <div className="flex-1 pt-0">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <h3 className="text-sm font-semibold" data-testid="text-title">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs" data-testid="badge-category">
            {category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{lastAccessedDate}</p>
        {conceptId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewClick}
            className="text-xs h-auto py-0.5 px-1.5 font-normal text-[#303331]"
            data-testid="button-view-knowledge"
          >
            View in Knowledge base
          </Button>
        )}
      </div>
    </div>
  );
}
