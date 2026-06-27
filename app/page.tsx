/* Home — first-run empty state (S1) or story list (S2). */
"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button, EmptyState } from "@/components/ui";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { StoryCard } from "@/components/StoryCard";
import { storyStore } from "@/lib/store";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const stories = useSyncExternalStore(
    storyStore.subscribe,
    storyStore.getSnapshot,
    storyStore.getServerSnapshot,
  );

  const openEditor = (id: string) => router.push(`/story/${id}`);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark}>✦</span> Fanfic
        </div>
        {stories.length > 0 ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            New story
          </Button>
        ) : null}
      </header>

      {stories.length === 0 ? (
        <EmptyState
          icon="✦"
          title="Start your first story"
          description="Set a universe, cast your characters, pick a tone — then draft chapters with Claude co-writing at your side."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create your first story
            </Button>
          }
        />
      ) : (
        <section className={styles.grid}>
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </section>
      )}

      <CreateStoryModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(story) => {
          setCreating(false);
          openEditor(story.id);
        }}
      />
    </main>
  );
}
