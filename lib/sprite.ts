/** A hosted fal picture can be sent for background removal. Local and student-supplied URLs cannot. */
export function hostedPicture(url: string) {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        return parsed.protocol === 'https:' && (host === 'fal.media' || host.endsWith('.fal.media') || host.endsWith('.fal.ai'));
    }
    catch {
        return false;
    }
}
/** Stage actors use the transparent picture when one has been saved. Cards keep imageUrl. */
export function actorImage(character: { spriteUrl?: string; imageUrl?: string }) {
    return character.spriteUrl || character.imageUrl || '/Cagentsit.webp';
}
