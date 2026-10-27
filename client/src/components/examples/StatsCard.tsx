import { StatsCard } from '../stats-card';
import { BookOpen } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatsCard
        title="Concepts Learned"
        value="24"
        icon={BookOpen}
        description="+3 this week"
      />
      <StatsCard
        title="Learning Streak"
        value="7 days"
        icon={BookOpen}
        description="Keep it up!"
      />
    </div>
  );
}
