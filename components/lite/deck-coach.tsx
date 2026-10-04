'use client';
import { useRef, useState } from 'react';
import type { Character, Story } from '@/lib/types';
import { api, Bear } from './common';

export default function DeckCoach({ story, cast }: { story: Story | null; cast: Character[] }) {
  const [message, setMessage] = useState('Choose who will join your adventure. What might they want?');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function ask() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const response = await api('/api/ai', { kind: 'chat', storyId: story?.id, selectedNode: { stage: 'choose characters', cast: cast.map(c => ({ name: c.name, traits: c.traits })) }, message: cast.length ? 'Help me think about these selected characters. Ask one short question about what they might want or how they could work together. Do not write the story.' : 'Help me choose a character to start a story. Give one simple next step and one short thinking question.' });
      setMessage(response.message);
    } catch (error) { setError((error as Error).message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="deck-coach"><Bear pose="cagent-board.webp" responsePose="cagent-welcome.webp" message={message} busy={busy} onAction={() => void ask()}/>{error && <p className="error-text" role="alert">{error}</p>}</div>;
}
