import { KnowledgeCard } from '../knowledge-card';

export default function KnowledgeCardExample() {
  return (
    <KnowledgeCard
      title="Newton's Third Law of Motion"
      description="For every action, there is an equal and opposite reaction."
      category="Physics"
      applications={[
        "Rocket propulsion: Rockets expel gas downward, creating an upward thrust",
        "Swimming: Pushing water backward propels the swimmer forward",
      ]}
      pseudocode={`function calculateReaction(force, mass):
  acceleration = force / mass
  reactionForce = -force
  return reactionForce`}
      relatedConcepts={["Conservation of Momentum", "Force Vectors"]}
      timestamp="2 hours ago"
    />
  );
}
