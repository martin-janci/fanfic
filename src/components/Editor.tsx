/*
 * Chapter editor (S4) + co-writing actions (S5).
 * Three zones: Story Bible rail · serif manuscript · co-writing toolbar.
 * Continue / Rewrite selection / Suggest next beat wired to the M2 co-writing API
 * (BIT-252). Nothing commits to the manuscript without explicit acceptance.
 */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button, Input, Modal, Toast } from "./ui";
import { RailBible } from "./RailBible";
import { CowritePanel, type PanelState } from "./CowritePanel";
import { ExportModal } from "./ExportModal";
import { storyStore } from "@/lib/store";
import { toStoryBible } from "@/lib/types";
import {
  CowriteError,
  continueChapter,
  rewriteSelection,
  suggestBeats,
  type Beat,
  type Selection,
} from "@/lib/cowrite";
import styles from "./Editor.module.css";

type SaveState = "idle" | "saving" | "saved";

function isAbort(e: unknown): boolean {
  return e instanceof DOMException ? e.name === "AbortError" : false;
}

export function Editor({ storyId }: { storyId: string }) {
  const stories = useSyncExternalStore(
    storyStore.subscribe,
    storyStore.getSnapshot,
    storyStore.getServerSnapshot,
  );
  const story = stories.find((s) => s.id === storyId);

  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [body, setBody] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Rewrite-instruction modal state
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const rewriteTarget = useRef<Selection | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sel = useRef<Selection>({ text: "", start: 0, end: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRun = useRef<null | (() => void)>(null);

  // Pick the first chapter once the story resolves / when switching chapter is gone.
  const chapters = story ? [...story.chapters].sort((a, b) => a.order - b.order) : [];
  useEffect(() => {
    if (!story) return;
    if (!story.chapters.some((c) => c.id === activeChapterId)) {
      const first = [...story.chapters].sort((a, b) => a.order - b.order)[0];
      if (first) {
        setActiveChapterId(first.id);
        setBody(first.body);
      }
    }
  }, [story, activeChapterId]);

  const switchChapter = (id: string) => {
    flushSave();
    const c = story?.chapters.find((x) => x.id === id);
    setActiveChapterId(id);
    setBody(c?.body ?? "");
    setPanel(null);
  };

  // Debounced optimistic autosave ("● Saved" indicator).
  const scheduleSave = useCallback(
    (value: string) => {
      if (!story || !activeChapterId) return;
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        storyStore.updateChapter(story.id, activeChapterId, { body: value });
        setSaveState("saved");
      }, 500);
    },
    [story, activeChapterId],
  );

  const flushSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (story && activeChapterId) {
      storyStore.updateChapter(story.id, activeChapterId, { body });
    }
  };

  const onBodyChange = (value: string) => {
    setBody(value);
    scheduleSave(value);
  };

  const captureSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    sel.current = {
      start: el.selectionStart,
      end: el.selectionEnd,
      text: body.slice(el.selectionStart, el.selectionEnd),
    };
  };

  const flash = (msg: string) => setToast(msg);

  // ---- splice helpers (commit to manuscript) ----
  const insertAt = (text: string, at: number) => {
    const before = body.slice(0, at);
    const after = body.slice(at);
    const needsLead = before.length > 0 && !/\s$/.test(before);
    const next = before + (needsLead ? " " : "") + text + after;
    onBodyChange(next);
  };

  const replaceRange = (text: string, start: number, end: number) => {
    const next = body.slice(0, start) + text + body.slice(end);
    onBodyChange(next);
  };

  if (!story) {
    return (
      <div className={styles.missing}>
        <p>That story could not be found.</p>
        <Link href="/">← Back to your stories</Link>
      </div>
    );
  }

  const bible = toStoryBible(story);
  const hasSelection = sel.current.end > sel.current.start;

  // ---- action runners ----
  async function runStream(
    action: "continue" | "rewrite",
    fn: (opts: {
      onChunk: (t: string) => void;
      signal: AbortSignal;
    }) => Promise<string>,
    selectionText = "",
  ) {
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    setPanel({ phase: "generating", action, text: "" });
    try {
      await fn({
        onChunk: (t) => {
          acc = t;
          setPanel({ phase: "generating", action, text: t });
        },
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof CowriteError) {
        setPanel({ phase: "error", action, message: e.message });
        return;
      }
      if (!isAbort(e)) {
        setPanel({
          phase: "error",
          action,
          message: "Something went wrong reaching Claude. Retry?",
        });
        return;
      }
      // aborted (Stop): fall through using whatever streamed so far
    } finally {
      abortRef.current = null;
    }
    if (!acc.trim()) {
      setPanel(null);
      return;
    }
    if (action === "continue") setPanel({ phase: "review", action: "continue", text: acc });
    else setPanel({ phase: "diff", action: "rewrite", before: selectionText, after: acc });
  }

  const doContinue = () => {
    captureSelection();
    const caretIndex = sel.current.start || body.length;
    lastRun.current = doContinue;
    void runStream("continue", (opts) =>
      continueChapter({ storyBible: bible, chapterText: body, caretIndex }, opts),
    );
  };

  const openRewrite = () => {
    captureSelection();
    if (sel.current.end <= sel.current.start) {
      flash("Select some text to rewrite first.");
      return;
    }
    rewriteTarget.current = { ...sel.current };
    setInstruction("");
    setRewriteOpen(true);
  };

  const doRewrite = () => {
    const target = rewriteTarget.current;
    if (!target) return;
    setRewriteOpen(false);
    lastRun.current = doRewrite;
    void runStream(
      "rewrite",
      (opts) =>
        rewriteSelection(
          {
            storyBible: bible,
            chapterText: body,
            selection: target,
            instruction: instruction.trim() || "Improve this passage.",
          },
          opts,
        ),
      target.text,
    );
  };

  const doSuggest = async () => {
    captureSelection();
    lastRun.current = () => void doSuggest();
    const controller = new AbortController();
    abortRef.current = controller;
    setPanel({ phase: "generating", action: "suggest", text: "" });
    try {
      const beats = await suggestBeats(
        { storyBible: bible, chapterText: body },
        { signal: controller.signal },
      );
      setPanel({ phase: "beats", action: "suggest", beats });
    } catch (e) {
      if (isAbort(e)) {
        setPanel(null);
        return;
      }
      const message =
        e instanceof CowriteError
          ? e.message
          : "Something went wrong reaching Claude. Retry?";
      setPanel({ phase: "error", action: "suggest", message });
    } finally {
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const keep = () => {
    if (!panel) return;
    if (panel.phase === "review") {
      insertAt(panel.text.trim(), sel.current.start || body.length);
      flash("Continuation inserted ✦");
    } else if (panel.phase === "diff") {
      const t = rewriteTarget.current ?? sel.current;
      replaceRange(panel.after.trim(), t.start, t.end);
      flash("Rewrite applied ✦");
    }
    setPanel(null);
  };

  const insertBeat = (beat: Beat) => {
    insertAt(`\n\n> ✦ ${beat.summary}\n\n`, sel.current.start || body.length);
    setPanel(null);
    flash("Beat inserted ✦");
  };

  const regenerate = () => lastRun.current?.();
  const dismiss = () => setPanel(null);

  return (
    <div className={styles.shell}>
      <RailBible
        story={story}
        activeChapterId={activeChapterId}
        onSelectChapter={switchChapter}
        onAddChapter={() => {
          const c = storyStore.addChapter(story.id);
          switchChapter(c.id);
        }}
      />

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.cowriteGroup} role="group" aria-label="Claude co-writing actions">
            <button className={styles.aiBtn} onClick={doContinue} disabled={!!panel}>
              ▸ Continue
            </button>
            <button
              className={styles.aiBtn}
              onClick={openRewrite}
              disabled={!!panel || !hasSelection}
              title={hasSelection ? "" : "Select text first"}
            >
              ↻ Rewrite selection
            </button>
            <button className={styles.aiBtn} onClick={() => void doSuggest()} disabled={!!panel}>
              ✦ Suggest next beat
            </button>
          </div>
          <div className={styles.toolbarRight}>
            <span className={styles.save} data-state={saveState}>
              {saveState === "saving" ? "● Saving…" : saveState === "saved" ? "● Saved" : ""}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setExporting(true)}>
              Export
            </Button>
          </div>
        </div>

        <div className={styles.canvas}>
          <input
            className={styles.chapterTitle}
            value={chapters.find((c) => c.id === activeChapterId)?.title ?? ""}
            onChange={(e) =>
              storyStore.updateChapter(story.id, activeChapterId, { title: e.target.value })
            }
            aria-label="Chapter title"
          />
          <textarea
            ref={textareaRef}
            className={styles.manuscript}
            value={body}
            placeholder="Begin your chapter… or let Claude take the first line with ▸ Continue."
            onChange={(e) => onBodyChange(e.target.value)}
            onSelect={captureSelection}
            onKeyUp={captureSelection}
            onClick={captureSelection}
            onBlur={flushSave}
            spellCheck
          />

          {panel ? (
            <CowritePanel
              state={panel}
              onStop={stop}
              onKeep={keep}
              onDiscard={dismiss}
              onRegenerate={regenerate}
              onRetry={regenerate}
              onInsertBeat={insertBeat}
            />
          ) : null}
        </div>
      </main>

      <Modal
        open={rewriteOpen}
        onClose={() => setRewriteOpen(false)}
        title="Rewrite selection"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRewriteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={doRewrite}>
              Rewrite
            </Button>
          </>
        }
      >
        <p className={styles.rewriteHint}>
          How should Claude rewrite the selected passage?
        </p>
        <Input
          value={instruction}
          autoFocus
          placeholder='e.g. "make it tenser", "more in Elara’s voice"'
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doRewrite();
          }}
        />
      </Modal>

      <ExportModal
        story={story}
        open={exporting}
        onClose={() => setExporting(false)}
        onExported={() => flash("Exported to Markdown ✦")}
      />

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
