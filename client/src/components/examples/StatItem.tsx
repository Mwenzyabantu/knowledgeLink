import { StatItem } from '../stat-item';

export default function StatItemExample() {
  return (
    <div className="grid grid-cols-2 gap-8 border-y py-8">
      <StatItem label="Concepts" value="24" subtitle="+3 this week" />
      <StatItem label="Problems Solved" value="47" subtitle="Real-world applications" />
    </div>
  );
}
