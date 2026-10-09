import { EmptyState } from '../empty-state';
import { BookOpen } from 'lucide-react';

export default function EmptyStateExample() {
  return (
    <EmptyState
      icon={BookOpen}
      title="No Concepts Yet"
      description="Start adding concepts you've learned to build your knowledge base."
      actionLabel="Add Your First Concept"
      onAction={() => console.log('Action clicked')}
    />
  );
}
