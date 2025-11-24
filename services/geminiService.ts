// API endpoint - works both locally (Vite proxy) and in production (Vercel)
const API_BASE = import.meta.env.PROD ? '' : '';

export const brainstormNotes = async (
  context: string,
  count: number = 3
): Promise<string[]> => {
  if (!context || context.length < 3) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/api/brainstorm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, count }),
    });

    if (response.status === 429) {
      const data = await response.json();
      // Return a helpful message as a "note" so user sees it
      return [data.message || "Rate limit reached. Try again later."];
    }

    if (!response.ok) {
      console.error('Brainstorm API error:', response.status);
      return ["AI temporarily unavailable", "Try again in a moment"];
    }

    const data = await response.json();
    return data.ideas || [];

  } catch (error) {
    console.error("Brainstorm request failed:", error);
    return ["Connection error", "Check your internet"];
  }
};

export const generateClusterTitle = async (notes: string[]): Promise<string> => {
  if (notes.length === 0) return "Empty Cluster";

  try {
    const response = await fetch(`${API_BASE}/api/cluster-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      return "New Cluster";
    }

    const data = await response.json();
    return data.title || "Group";

  } catch (error) {
    console.error("Cluster title request failed:", error);
    return "Group";
  }
};
