/*
 * Fanfic client-side data model (BIT-251).
 * Shared with persistence (M3, BIT-253) and the co-writing API (M2, BIT-252).
 *
 * A Story carries its "Story Bible" (universe + characters + tone) inline; the
 * bible grounds every co-writing call. Chapters are the manuscript.
 */

export interface Character {
  id: string;
  /** Display name; shown as a removable chip in the create-story form. */
  name: string;
  /** Optional freeform: role, voice, key traits, relationships. */
  notes?: string;
}

/**
 * The structured story context sent to the co-writing API. The backend renders
 * the deterministic STORY CONTEXT text block (prompt-contract §2.3) from this.
 */
export interface StoryBible {
  title: string;
  /** Fandom / universe blurb: setting, canon notes, rules. */
  universe: string;
  characters: Character[];
  /** Tone descriptors, POV, tense, and any content boundaries the author set. */
  tone: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  /** Manuscript text (plain text / light Markdown). */
  body: string;
  /** Ordering within the story (0-based). */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  title: string;
  universe: string;
  characters: Character[];
  tone: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a story (the create-story form payload). */
export interface StoryDraft {
  title: string;
  universe: string;
  characters: Character[];
  tone: string;
}

/** Project the bible (the prompt-grounding subset) out of a full Story. */
export function toStoryBible(story: Story | StoryDraft): StoryBible {
  return {
    title: story.title,
    universe: story.universe,
    characters: story.characters,
    tone: story.tone,
  };
}
