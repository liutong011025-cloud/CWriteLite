export type Character = {
    id: string;
    name: string;
    age: string;
    species?: string;
    appearance: string;
    traits: string;
    background: string;
    strength: string;
    challenge: string;
    imageUrl: string;
    spriteUrl?: string;
    sketch: string;
};
export type CanvasNode = {
    id: string;
    type: 'character' | 'object' | 'setting' | 'goal' | 'note';
    label: string;
    imageUrl?: string;
    characterId?: string;
    x: number;
    y: number;
    details?: string;
};
export type CanvasAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type CanvasEdge = {
    id: string;
    source: string;
    target: string;
    label: string;
    color: string;
    sourceAnchor?: CanvasAnchor;
    targetAnchor?: CanvasAnchor;
};
export type StoryCanvas = {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    writingType?: 'story' | 'drama';
    drama?: DramaProject;
};
export type DramaLine = {
    id: string;
    kind: 'dialogue' | 'thought' | 'action';
    characterId: string;
    text: string;
};
export type DramaActor = { characterId: string; x: number; y: number; scale: number; flipped: boolean };
export type DramaScene = {
    id: string;
    name: string;
    backgroundPrompt: string;
    settingDescription?: string;
    backgroundImageUrl: string;
    notes: string;
    actors: DramaActor[];
    lines: DramaLine[];
    archivedLines?: DramaLine[];
};
export type DramaProject = { scenes: DramaScene[]; activeScene: number; mode?: 'tableau' };
export type Story = {
    id: string;
    title: string;
    status: string;
    stage: string;
    level: number;
    characterIds: string[];
    characterSnapshots: Character[];
    canvas: StoryCanvas;
    sections: string[];
    activeSection: number;
    content: string;
    pin: {
        x: number;
        y: number;
    } | null;
    chapterIndex: number;
    updatedAt: string;
};
export type User = {
    id: string;
    username: string;
    role: 'student' | 'teacher';
};
export const STAGES = ['The Beginning', 'Rising Action', 'The Climax', 'Falling Action', 'The Ending'];
export const QUESTIONS = ['Who is in your story? Where does it begin?', 'What does your character want? What gets in the way?', 'What is the biggest challenge? What choice will your character make?', 'What happens after that choice?', 'How does it end? What has your character learned?'];
export type Language = 'en' | 'zh';
export type StoryState = Record<string, unknown>;
export type BookReviewState = Record<string, unknown>;
export type LetterState = Record<string, unknown>;
export type MapWorkType = 'story' | 'review' | 'letter' | 'drama' | 'poetry';
export type MapFlagItem = {
    id: string;
    x: number;
    y: number;
    title: string;
    content?: string;
    workType?: MapWorkType;
    previewArt?: {imageUrl:string;storyId?:string;anchor?:'bottom-center';version?:string};
};
