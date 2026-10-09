import { TimelineView } from '../timeline-view';

export default function TimelineViewExample() {
  const items = [
    {
      id: "1",
      title: "Newton's Third Law of Motion",
      category: "Physics",
      date: "Today at 2:30 PM",
      connections: 2,
    },
    {
      id: "2",
      title: "Photosynthesis",
      category: "Biology",
      date: "Yesterday at 4:15 PM",
      connections: 3,
    },
    {
      id: "3",
      title: "Pythagorean Theorem",
      category: "Mathematics",
      date: "3 days ago",
      connections: 5,
    },
  ];

  return <TimelineView items={items} />;
}
