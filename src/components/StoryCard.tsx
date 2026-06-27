/* Story card (S2 grid). Click → editor. */
"use client";

import Link from "next/link";
import { Tag } from "./ui";
import type { Story } from "@/lib/types";
import styles from "./StoryCard.module.css";

export function StoryCard({ story }: { story: Story }) {
  const chapterCount = story.chapters.length;
  const words = story.chapters.reduce(
    (n, c) => n + (c.body.trim() ? c.body.trim().split(/\s+/).length : 0),
    0,
  );
  return (
    <Link href={`/story/${story.id}`} className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{story.title}</h3>
        {story.tone ? <Tag tone="draft">{story.tone}</Tag> : null}
      </div>
      <p className={styles.blurb}>{story.universe || "No universe set yet."}</p>
      <div className={styles.meta}>
        <span>
          {chapterCount} chapter{chapterCount === 1 ? "" : "s"}
        </span>
        <span>·</span>
        <span>{words.toLocaleString()} words</span>
        {story.characters.length ? (
          <>
            <span>·</span>
            <span>
              {story.characters.length} character{story.characters.length === 1 ? "" : "s"}
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
