/* Editor left rail (S4): Story Bible summary + chapter list. */
"use client";

import Link from "next/link";
import { Tag } from "./ui";
import type { Story } from "@/lib/types";
import styles from "./RailBible.module.css";

export function RailBible({
  story,
  activeChapterId,
  onSelectChapter,
  onAddChapter,
}: {
  story: Story;
  activeChapterId: string;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
}) {
  return (
    <aside className={styles.rail}>
      <Link href="/" className={styles.back}>
        ← All stories
      </Link>

      <h1 className={styles.title}>{story.title}</h1>

      <section className={styles.section}>
        <div className={styles.sectionHead}>Universe</div>
        <p className={styles.body}>{story.universe || "—"}</p>
      </section>

      {story.characters.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>Characters</div>
          <div className={styles.chips}>
            {story.characters.map((c) => (
              <span key={c.id} className={styles.charChip}>
                {c.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {story.tone ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>Tone</div>
          <Tag tone="draft">{story.tone}</Tag>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          Chapters
          <button className={styles.addBtn} onClick={onAddChapter} aria-label="Add chapter">
            +
          </button>
        </div>
        <ul className={styles.chapterList}>
          {[...story.chapters]
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <li key={c.id}>
                <button
                  className={`${styles.chapterItem} ${
                    c.id === activeChapterId ? styles.active : ""
                  }`}
                  onClick={() => onSelectChapter(c.id)}
                >
                  {c.title}
                </button>
              </li>
            ))}
        </ul>
      </section>
    </aside>
  );
}
