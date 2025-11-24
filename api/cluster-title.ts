import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { notes } = req.body || {};

  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return res.status(200).json({ title: 'Empty Cluster' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ title: 'New Cluster' });
  }

  try {
    const context = notes.slice(0, 10).join(', ');
    const prompt = `Analyze these sticky notes and provide a single, short (2-4 words) title. Notes: "${context}". Return ONLY the title string.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!response.ok) {
      return res.status(200).json({ title: 'Creative Cluster' });
    }

    const data = await response.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || 'Group';

    return res.status(200).json({ title });

  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ title: 'Group' });
  }
}
