/*
 * Markdown export (S6). Client-side serializer powering the export modal's live
 * preview / Copy / Download. M3 (BIT-253) may also expose a server export; this
 * keeps the FE flow self-contained and is the single source for the preview.
 */
import type { Story } from "./types";

export function storyToMarkdown(story: Story): string {
  const lines: string[] = [];
  lines.push(`# ${story.title || "Untitled story"}`, "");

  if (story.universe.trim()) {
    lines.push(`> ${story.universe.trim().replace(/\n+/g, " ")}`, "");
  }

  for (const chapter of [...story.chapters].sort((a, b) => a.order - b.order)) {
    lines.push(`## ${chapter.title || "Untitled chapter"}`, "");
    const body = chapter.body.trim();
    lines.push(body.length ? body : "_(empty)_", "");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export function downloadMarkdown(story: Story): void {
  const md = storyToMarkdown(story);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(story.title) || "story"}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
