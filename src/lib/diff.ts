/*
 * Minimal word-level diff for the Rewrite-selection review (old struck / new highlighted).
 * LCS over whitespace-split tokens — adequate for short rewritten spans (MVP).
 */
export type DiffOp = { type: "same" | "del" | "ins"; text: string };

export function wordDiff(before: string, after: string): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // LCS length table
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(ops, "same", a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(ops, "del", a[i]);
      i++;
    } else {
      push(ops, "ins", b[j]);
      j++;
    }
  }
  while (i < n) push(ops, "del", a[i++]);
  while (j < m) push(ops, "ins", b[j++]);
  return ops;
}

function tokenize(s: string): string[] {
  // keep the trailing whitespace attached to each word so re-joins read naturally
  return s.match(/\S+\s*|\s+/g) ?? [];
}

function push(ops: DiffOp[], type: DiffOp["type"], text: string): void {
  const last = ops[ops.length - 1];
  if (last && last.type === type) last.text += text;
  else ops.push({ type, text });
}
