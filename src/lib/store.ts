/*
 * Story store — single-user, no auth (charter MVP scope).
 *
 * MVP persistence is localStorage; the API below is the seam M3 (BIT-253) replaces
 * with a real persistence service + Markdown export without touching the UI. All
 * reads/writes go through this module so the swap is mechanical.
 */
"use client";

import { uid } from "./id";
import type { Chapter, Story, StoryDraft } from "./types";

const STORAGE_KEY = "fanfic.stories.v1";

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: Story[] | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function read(): Story[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Story[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(stories: Story[]): void {
  cache = stories;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    } catch {
      /* quota / private mode — keep in-memory cache so the session still works */
    }
  }
  listeners.forEach((l) => l());
}

export const storyStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Stable snapshot for useSyncExternalStore. */
  getSnapshot(): Story[] {
    return read();
  },

  getServerSnapshot(): Story[] {
    return [];
  },

  list(): Story[] {
    return read();
  },

  get(id: string): Story | undefined {
    return read().find((s) => s.id === id);
  },

  create(draft: StoryDraft): Story {
    const ts = nowIso();
    const story: Story = {
      id: uid(),
      title: draft.title.trim(),
      universe: draft.universe.trim(),
      characters: draft.characters,
      tone: draft.tone.trim(),
      chapters: [],
      createdAt: ts,
      updatedAt: ts,
    };
    // First chapter is created up front so the writer lands in the editor.
    story.chapters.push(makeChapter(story.id, "Chapter 1", 0));
    write([story, ...read()]);
    return story;
  },

  update(id: string, patch: Partial<Omit<Story, "id" | "chapters">>): void {
    write(
      read().map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s,
      ),
    );
  },

  remove(id: string): void {
    write(read().filter((s) => s.id !== id));
  },

  addChapter(storyId: string, title?: string): Chapter {
    const stories = read();
    const story = stories.find((s) => s.id === storyId);
    if (!story) throw new Error(`Story ${storyId} not found`);
    const order = story.chapters.length;
    const chapter = makeChapter(storyId, title ?? `Chapter ${order + 1}`, order);
    story.chapters.push(chapter);
    story.updatedAt = nowIso();
    write([...stories]);
    return chapter;
  },

  updateChapter(
    storyId: string,
    chapterId: string,
    patch: Partial<Pick<Chapter, "title" | "body">>,
  ): void {
    const stories = read();
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;
    story.chapters = story.chapters.map((c) =>
      c.id === chapterId ? { ...c, ...patch, updatedAt: nowIso() } : c,
    );
    story.updatedAt = nowIso();
    write([...stories]);
  },

  removeChapter(storyId: string, chapterId: string): void {
    const stories = read();
    const story = stories.find((s) => s.id === storyId);
    if (!story) return;
    story.chapters = story.chapters
      .filter((c) => c.id !== chapterId)
      .map((c, i) => ({ ...c, order: i }));
    story.updatedAt = nowIso();
    write([...stories]);
  },
};

function makeChapter(storyId: string, title: string, order: number): Chapter {
  const ts = nowIso();
  return {
    id: uid(),
    storyId,
    title,
    body: "",
    order,
    createdAt: ts,
    updatedAt: ts,
  };
}
