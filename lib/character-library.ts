import type { Character } from './types';

// Only collapse identical built-in pack cards. Student-made cards may share names.
export function packCardKey(character: Character) {
  if (!character.imageUrl.startsWith('/dramacharacter/')) return character.id;
  return JSON.stringify([character.name, character.species || '', character.imageUrl, character.age, character.appearance, character.traits, character.background, character.strength, character.challenge, character.sketch]);
}

export function characterDeck(characters: Character[], selected: string[] = []) {
  const cards = new Map<string, Character>();
  for (const character of characters) {
    const key = packCardKey(character);
    const previous = cards.get(key);
    if (!previous || selected.includes(character.id) && !selected.includes(previous.id)) cards.set(key, character);
  }
  return [...cards.values()];
}
