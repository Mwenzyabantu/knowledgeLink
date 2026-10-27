import { TimelineItem } from '../timeline-item';

export default function TimelineItemExample() {
  return (
    <div>
      <TimelineItem
        title="Newton's Third Law of Motion"
        category="Physics"
        date="Today at 2:30 PM"
        lastAccessedDate="Today at 2:30 PM"
      />
      <TimelineItem
        title="Photosynthesis"
        category="Biology"
        date="Yesterday"
        lastAccessedDate="Yesterday"
        isLast
      />
    </div>
  );
}
