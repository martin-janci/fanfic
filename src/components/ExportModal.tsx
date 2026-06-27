/* Export (S6): live Markdown preview → Copy or Download .md. */
"use client";

import { useState } from "react";
import { Button, Modal } from "./ui";
import { downloadMarkdown, storyToMarkdown } from "@/lib/markdown";
import type { Story } from "@/lib/types";
import styles from "./ExportModal.module.css";

export function ExportModal({
  story,
  open,
  onClose,
  onExported,
}: {
  story: Story;
  open: boolean;
  onClose: () => void;
  onExported: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const md = storyToMarkdown(story);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      onExported();
    } catch {
      /* clipboard blocked — user can still Download */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export to Markdown"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              downloadMarkdown(story);
              onExported();
            }}
          >
            Download .md
          </Button>
        </>
      }
    >
      <pre className={styles.preview}>{md}</pre>
    </Modal>
  );
}
