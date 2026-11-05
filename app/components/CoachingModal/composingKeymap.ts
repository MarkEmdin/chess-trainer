import { extensions } from '@tiptap/core';

// While a phone keyboard composes a word, shortening it reaches ProseMirror
// as a change it reports as Backspace. Tiptap's handler claims that change
// without applying it, the composition breaks and the deleted letters come
// back. Declining lets ProseMirror apply the change itself.
export const ComposingKeymap = extensions.Keymap.extend({
  addKeyboardShortcuts() {
    const shortcuts = this.parent?.() ?? {};
    return {
      ...shortcuts,
      Backspace: (props) =>
        this.editor.view.composing
          ? false
          : (shortcuts.Backspace?.(props) ?? false),
    };
  },
});
