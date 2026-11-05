import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ComposingKeymap } from '@/app/components/CoachingModal/composingKeymap';

function press(editor: Editor, key: string, keyCode: number) {
  const event = new KeyboardEvent('keydown', { key, keyCode });
  return editor.view.someProp('handleKeyDown', (handle) =>
    handle(editor.view, event),
  );
}

function makeEditor() {
  return new Editor({
    extensions: [Document, Paragraph, Text, ComposingKeymap],
    enableCoreExtensions: { keymap: false },
    content: '<p>one</p><p>two</p>',
  });
}

describe('ComposingKeymap', () => {
  it('declines Backspace while the keyboard composes', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(6);
    Object.defineProperty(editor.view, 'composing', { value: true });
    expect(press(editor, 'Backspace', 8)).toBeFalsy();
    expect(editor.state.doc.childCount).toBe(2);
  });

  it('still joins paragraphs with Backspace when not composing', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(6);
    expect(press(editor, 'Backspace', 8)).toBe(true);
    expect(editor.state.doc.childCount).toBe(1);
  });

  it('still splits a paragraph with Enter', () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(3);
    expect(press(editor, 'Enter', 13)).toBe(true);
    expect(editor.state.doc.childCount).toBe(3);
  });
});
