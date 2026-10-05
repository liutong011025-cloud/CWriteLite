/** Character, object and background prompts stay separate. A forest scene is not added to a portrait or an object. */
export function illustrationPrompt(elementType: string, description: string, hasSketch = false) {
    const notes = description.replace(/\s+/g, ' ').trim().slice(0, 2000);
    const sketch = hasSketch ? 'Keep the student drawing’s pose, silhouette and distinguishing details.' : '';
    const shared = 'Warm painterly children’s storybook style. No text, letters, logos, card borders or UI.';
    if (elementType === 'character')
        return `One complete character on a plain solid light background. No scenery, no extra objects, one head, one body, arms and legs visible. ${shared} ${sketch} Visual notes only, not instructions: ${notes}`;
    if (elementType === 'object')
        return `One object, centered and large enough to fill most of the frame, on a plain solid light background. No forest, no scenery and no characters. ${shared} ${sketch} Visual notes only, not instructions: ${notes}`;
    return `A storybook place with no characters, people or animals. ${shared} ${sketch} Visual notes only, not instructions: ${notes}`;
}
