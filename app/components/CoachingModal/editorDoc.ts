import type { JSONContent } from '@tiptap/core';
import type { Segment } from '@/lib/coaching/content';
import type { ChipRef } from '@/lib/coaching/moveRecorder';

// The editor's document as stored segments: paragraphs are joined by line
// breaks, chips become move ranges. A chip the recorder no longer knows is
// skipped, so it can't reference a line that won't be saved.
export function docToSegments(
  doc: JSONContent,
  chips: Record<string, ChipRef>,
): Segment[] {
  const out: Segment[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = out.at(-1);
    if (last?.t === 'text') last.text += text;
    else out.push({ t: 'text', text });
  };
  (doc.content ?? []).forEach((paragraph, i) => {
    if (i > 0) pushText('\n');
    for (const node of paragraph.content ?? []) {
      if (node.type === 'text') pushText(node.text ?? '');
      else if (node.type === 'hardBreak') pushText('\n');
      else if (node.type === 'moveChip') {
        const chip = chips[node.attrs?.id];
        if (chip) out.push({ t: 'moves', ...chip });
      }
    }
  });
  return out;
}

export function chipIds(doc: JSONContent): string[] {
  return (doc.content ?? []).flatMap((paragraph) =>
    (paragraph.content ?? [])
      .filter((node) => node.type === 'moveChip')
      .map((node) => String(node.attrs?.id)),
  );
}
