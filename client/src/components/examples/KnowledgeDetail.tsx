import { KnowledgeDetail } from '../knowledge-detail';

export default function KnowledgeDetailExample() {
  return (
    <KnowledgeDetail
      title="Newton's Third Law of Motion"
      category="Physics"
      problem="How do we move objects in space where there's no ground to push against?"
      what="For every action force, there is an equal and opposite reaction force."
      why="This law explains how motion works and is fundamental to propulsion systems."
      how="Forces always come in pairs. When you push on a wall, the wall pushes back with equal force."
      where={[
        "Rocket propulsion in space travel",
        "Swimming and athletic performance",
      ]}
      who="Aerospace engineers, automotive designers, and physicists"
      when="Discovered by Isaac Newton in 1687"
      timestamp="2 hours ago"
    />
  );
}
