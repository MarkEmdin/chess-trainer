import { Node } from '@tiptap/core';

export const CHIP_CLASS =
  'inline-block rounded bg-primary/15 px-1.5 mx-0.5 font-mono text-sm text-primary cursor-pointer select-none';

// A move chip inside the editor: an inline atom that the caret steps over
// and Backspace deletes whole. Its moves live in the recorder (by `id`); the
// label is only what the text shows.
export const MoveChip = Node.create({
  name: 'moveChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      id: { default: null, rendered: false },
      label: { default: '', rendered: false },
    };
  },

  // Matches nothing: pasting HTML, even copied from a chip, never creates a
  // chip whose moves the recorder doesn't know.
  parseHTML() {
    return [];
  },

  renderHTML({ node }) {
    return [
      'span',
      {
        'data-chip': node.attrs.id,
        contenteditable: 'false',
        class: CHIP_CLASS,
      },
      node.attrs.label,
    ];
  },

  renderText({ node }) {
    return node.attrs.label;
  },
});
