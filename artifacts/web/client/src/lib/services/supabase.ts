async function apiFetch(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function generate5WH(userInput: string): Promise<any> {
  return apiFetch("/api/ai/generate-5wh", { userInput });
}

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  conceptContext?: string,
): Promise<string> {
  const data = await apiFetch("/api/ai/chat-response", {
    userMessage,
    conversationHistory,
    conceptContext,
  });
  return data.response as string;
}

export async function generateOpportunityProjects(): Promise<any[]> {
  const res = await fetch("/api/opportunity-projects/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}
