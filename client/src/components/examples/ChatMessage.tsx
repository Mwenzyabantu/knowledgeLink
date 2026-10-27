import { ChatMessage } from '../chat-message';

export default function ChatMessageExample() {
  return (
    <div className="space-y-6">
      <ChatMessage
        role="user"
        content="Can you explain how Newton's Third Law applies to rocket science?"
        timestamp="Just now"
      />
      <ChatMessage
        role="assistant"
        content="Great question! In rocket propulsion, Newton's Third Law is fundamental. When the rocket expels hot gases downward at high velocity, those gases push back on the rocket with equal force in the opposite direction, propelling it upward. This is why rockets work even in the vacuum of space where there's no air to push against."
        timestamp="Just now"
      />
    </div>
  );
}
