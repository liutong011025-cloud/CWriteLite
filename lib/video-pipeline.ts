import { createHash } from 'node:crypto';
import type { Story } from './types';

export const VIDEO_STORAGE_KEYS = ['TOS_ACCESS_KEY_ID', 'TOS_SECRET_ACCESS_KEY', 'TOS_BUCKET', 'TOS_REGION', 'TOS_ENDPOINT', 'VIDEO_WORKER_URL', 'VIDEO_WORKER_SECRET'] as const;

export type VideoBeat = { id: string; sceneId: string; kind: string; text: string; duration: number; lineId?: string; characterId?: string };

/** Names that must be set before a paid video task or a finished MP4 can be stored. */
export function missingVideoConfig(env: Record<string, string | undefined> = process.env) {
    const missing: string[] = [];
    if (!env.ARK_API_KEY) missing.push('ARK_API_KEY');
    for (const key of VIDEO_STORAGE_KEYS) if (!env[key]) missing.push(key);
    return missing;
}

export function dramaRevisionHash(story: Pick<Story, 'title' | 'canvas' | 'characterSnapshots'>, model: string) {
    const scenes = story.canvas.drama?.scenes || [];
    return createHash('sha256').update(JSON.stringify({
        title: story.title,
        model,
        scenes: scenes.map(scene => ({
            id: scene.id,
            background: scene.backgroundImageUrl,
            backgroundPrompt: scene.backgroundPrompt,
            settingDescription: scene.settingDescription,
            notes: scene.notes,
            actors: scene.actors,
            lines: scene.lines.map(line => ({ id: line.id, kind: line.kind, characterId: line.characterId, text: line.text })),
        })),
        cast: story.characterSnapshots.map(character => ({ id: character.id, image: character.spriteUrl || character.imageUrl })),
    })).digest('hex');
}

/** Keep every spoken line. A new clip starts only on a line boundary when the next line would pass 30 seconds. */
export function groupVideoBeats(beats: VideoBeat[], limit = 30) {
    const clips: { sceneId: string; sequence: number; duration: number; beats: VideoBeat[] }[] = [];
    let current: VideoBeat[] = [];
    let duration = 0;
    const flush = () => {
        if (!current.length) return;
        clips.push({ sceneId: current[0].sceneId, sequence: clips.length, duration, beats: current });
        current = [];
        duration = 0;
    };
    for (const beat of beats) {
        if (current.length && current[0].sceneId !== beat.sceneId) flush();
        if (beat.duration > limit) throw new Error('One line is too long for a video clip. Split it into shorter lines before generating.');
        if (current.length && duration + beat.duration > limit) flush();
        current.push(beat);
        duration += beat.duration;
    }
    flush();
    return clips;
}
