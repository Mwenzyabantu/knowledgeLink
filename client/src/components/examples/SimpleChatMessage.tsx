import { SimpleChatMessage } from '../simple-chat';

export default function SimpleChatMessageExample() {
  return (
    <div className="space-y-0">
      <SimpleChatMessage
        role="user"
        content="How does photosynthesis help solve climate change?"
        timestamp="Just now"
      />
      <SimpleChatMessage
        role="assistant"
        content="Great question! Photosynthesis addresses climate change in several ways. Plants absorb CO2 from the atmosphere during photosynthesis, acting as natural carbon capture systems. This helps reduce greenhouse gas concentrations that drive global warming."
        timestamp="Just now"
      />
    </div>
  );
}
