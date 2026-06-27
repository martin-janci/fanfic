/*
 * Co-writing review panel (S5). Renders the action state machine:
 *   generating → (review | diff | beats) → committed, or error.
 * Nothing reaches the manuscript without explicit Keep/Accept (forgiveness by default).
 */
"use client";

import { wordDiff } from "@/lib/diff";
import type { Beat } from "@/lib/cowrite";
import { Button, Tag } from "./ui";
import styles from "./CowritePanel.module.css";

export type CowriteAction = "continue" | "rewrite" | "suggest";

export type PanelState =
  | { phase: "generating"; action: CowriteAction; text: string }
  | { phase: "review"; action: "continue"; text: string }
  | { phase: "diff"; action: "rewrite"; before: string; after: string }
  | { phase: "beats"; action: "suggest"; beats: Beat[] }
  | { phase: "error"; action: CowriteAction; message: string };

const LABEL: Record<CowriteAction, string> = {
  continue: "Continue",
  rewrite: "Rewrite selection",
  suggest: "Suggest next beat",
};

export function CowritePanel({
  state,
  onStop,
  onKeep,
  onDiscard,
  onRegenerate,
  onRetry,
  onInsertBeat,
}: {
  state: PanelState;
  onStop: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  onRegenerate: () => void;
  onRetry: () => void;
  onInsertBeat: (beat: Beat) => void;
}) {
  return (
    <div className={styles.panel} role="region" aria-label="Claude co-writing">
      <div className={styles.head}>
        <Tag tone="ai">✦ {LABEL[state.action]}</Tag>
        {state.phase === "generating" ? (
          <span className={styles.status}>Claude is writing…</span>
        ) : state.phase === "error" ? (
          <span className={styles.statusErr}>Couldn’t reach Claude</span>
        ) : (
          <span className={styles.status}>✦ Claude wrote this — review before keeping</span>
        )}
      </div>

      {state.phase === "generating" ? (
        <div className={styles.gen}>
          {state.text ? (
            <p className={styles.prose}>{state.text}</p>
          ) : (
            <div className={styles.shimmerWrap} aria-hidden>
              <span className="shimmerLine" />
              <span className="shimmerLine" />
              <span className="shimmerLine" style={{ width: "70%" }} />
            </div>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={onStop}>
              ◼ Stop
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === "review" ? (
        <div className={styles.gen}>
          <p className={styles.prose}>{state.text}</p>
          <div className={styles.actions}>
            <Button variant="primary" size="sm" onClick={onKeep}>
              Keep
            </Button>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              Discard
            </Button>
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              ↻ Regenerate
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === "diff" ? (
        <div className={styles.gen}>
          <p className={styles.diff}>
            {wordDiff(state.before, state.after).map((op, i) =>
              op.type === "same" ? (
                <span key={i}>{op.text}</span>
              ) : op.type === "del" ? (
                <del key={i} className={styles.del}>
                  {op.text}
                </del>
              ) : (
                <ins key={i} className={styles.ins}>
                  {op.text}
                </ins>
              ),
            )}
          </p>
          <div className={styles.actions}>
            <Button variant="primary" size="sm" onClick={onKeep}>
              Accept rewrite
            </Button>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              Keep original
            </Button>
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              ↻ Regenerate
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === "beats" ? (
        <div className={styles.gen}>
          <ul className={styles.beats}>
            {state.beats.map((b, i) => (
              <li key={i} className={styles.beat}>
                <div className={styles.beatText}>
                  <strong>{b.summary}</strong>
                  <span className={styles.beatWhy}>{b.rationale}</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => onInsertBeat(b)}>
                  Insert
                </Button>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              Dismiss
            </Button>
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              ↻ Regenerate
            </Button>
          </div>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <div className={styles.gen}>
          <p className={styles.errMsg}>{state.message}</p>
          <div className={styles.actions}>
            <Button variant="primary" size="sm" onClick={onRetry}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
