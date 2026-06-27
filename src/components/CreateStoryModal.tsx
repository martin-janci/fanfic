/* Create-story form (S3) — captures the Story Bible: title, universe, characters, tone. */
"use client";

import { useState } from "react";
import { Button, ChipInput, Field, Input, Modal, Select, Textarea } from "./ui";
import { storyStore } from "@/lib/store";
import { uid } from "@/lib/id";
import type { Story } from "@/lib/types";

const TONE_PRESETS = [
  "Dark & atmospheric",
  "Light & comedic",
  "Epic & sweeping",
  "Tense thriller",
  "Slow-burn romance",
  "Wry & literary",
];

export function CreateStoryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (story: Story) => void;
}) {
  const [title, setTitle] = useState("");
  const [universe, setUniverse] = useState("");
  const [characters, setCharacters] = useState<string[]>([]);
  const [tone, setTone] = useState("");

  const reset = () => {
    setTitle("");
    setUniverse("");
    setCharacters([]);
    setTone("");
  };

  const canSubmit = title.trim().length > 0 && universe.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    const story = storyStore.create({
      title,
      universe,
      tone,
      characters: characters.map((name) => ({ id: uid(), name })),
    });
    reset();
    onCreated(story);
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create a story"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            Create story
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <Field label="Title">
          <Input
            value={title}
            autoFocus
            placeholder="e.g. Embers of the North"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </Field>

        <Field
          label="Universe / fandom"
          hint="Setting, canon notes, the rules of this world. Grounds every co-writing call."
        >
          <Textarea
            value={universe}
            placeholder="A frostbound kingdom where memory can be traded as currency…"
            onChange={(e) => setUniverse(e.target.value)}
          />
        </Field>

        <Field label="Characters" hint="Press Enter or comma to add. Backspace removes the last.">
          <ChipInput
            values={characters}
            onChange={setCharacters}
            placeholder="e.g. Elara, Captain Ross…"
          />
        </Field>

        <Field label="Tone & style" hint="Pick a starting point or write your own.">
          <Select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="">Choose a tone…</option>
            {TONE_PRESETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
