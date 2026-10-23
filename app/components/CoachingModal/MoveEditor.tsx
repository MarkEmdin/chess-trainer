'use client';

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { MAX_VARIATION_MOVES } from '@/lib/chess/variation';
import { MAX_CHIPS, MAX_LINES, type Segment } from '@/lib/coaching/content';
import {
  activateChip,
  backToKey,
  canUndo,
  initialRecorder,
  markTyped,
  recordMove,
  syncChips,
  undoMove,
  type Edit,
  type RecorderError,
  type RecorderState,
} from '@/lib/coaching/moveRecorder';
import { chipIds, docToSegments } from './editorDoc';
import { MoveChip } from './moveChip';

// The recorder state, readable synchronously: one board move updates it and
// then edits the text, and the editor's own callbacks need the new state
// before React has re-rendered.
export type RecorderStore = {
  state: RecorderState;
  get: () => RecorderState;
  update: (fn: (s: RecorderState) => RecorderState) => void;
};

// `initial` restores a saved draft (spec 012).
export function useRecorderStore(
  fen: string,
  initial?: RecorderState,
): RecorderStore {
  const [state, setState] = useState(() => initial ?? initialRecorder(fen));
  const ref = useRef(state);
  const get = useCallback(() => ref.current, []);
  const update = useCallback((fn: (s: RecorderState) => RecorderState) => {
    ref.current = fn(ref.current);
    setState(ref.current);
  }, []);
  return { state, get, update };
}

export type MoveEditorApi = {
  // A move played on the board; false when it was refused.
  move: (from: string, to: string) => boolean;
  focus: () => void;
};

type Props = {
  store: RecorderStore;
  label: string;
  placeholder: string;
  onSegmentsChange: (segments: Segment[]) => void;
  onFocus: () => void;
  // A saved draft to start from; its chips must be in `store`.
  initialDoc?: JSONContent;
  // Every change to the text, for saving a draft.
  onDocChange?: (doc: JSONContent) => void;
  ref?: Ref<MoveEditorApi>;
};

const LIMITS: Record<Exclude<RecorderError, 'illegal'>, number> = {
  tooManyLines: MAX_LINES,
  lineTooLong: MAX_VARIATION_MOVES,
  tooManyChips: MAX_CHIPS,
};

function findChip(editor: Editor, id: string): number {
  let pos = -1;
  editor.state.doc.descendants((node, p) => {
    if (pos >= 0) return false;
    if (node.type.name === 'moveChip' && node.attrs.id === id) pos = p;
  });
  return pos;
}

// Text editor for a question or an answer (spec 011): moves played on the
// board while it is focused land at the caret as chips.
export default function MoveEditor({
  store,
  label,
  placeholder,
  onSegmentsChange,
  onFocus,
  initialDoc,
  onDocChange,
  ref,
}: Props) {
  const t = useTranslations('coaching.editor');
  const scope = useId();
  const [error, setError] = useState<Exclude<RecorderError, 'illegal'> | null>(
    null,
  );
  // Where the caret was after our own last edit: a selection change that
  // lands anywhere else means the user moved the caret.
  const lastOwnPos = useRef<number | null>(null);
  const latest = useRef({ onSegmentsChange, onFocus, onDocChange });
  useEffect(() => {
    latest.current = { onSegmentsChange, onFocus, onDocChange };
  });

  const editor = useEditor({
    immediatelyRender: false,
    content: initialDoc,
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({ placeholder }),
      UndoRedo,
      MoveChip,
    ],
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        class:
          'move-editor min-h-40 sm:min-h-60 rounded-md border border-input bg-background px-3 py-2 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring',
      },
      // Plain text only: formatting and chips never come in through paste.
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        view.dispatch(view.state.tr.insertText(text));
        return true;
      },
      handleClickOn(view, _pos, node) {
        if (node.type.name !== 'moveChip') return false;
        store.update((s) => activateChip(s, node.attrs.id));
        lastOwnPos.current = view.state.selection.from;
        return true;
      },
    },
    onFocus: () => latest.current.onFocus(),
    // A restored draft is text the form must know about before any edit.
    onCreate: ({ editor }) => {
      if (!initialDoc) return;
      latest.current.onSegmentsChange(
        docToSegments(editor.getJSON(), store.get().chips),
      );
    },
    onSelectionUpdate: ({ editor, transaction }) => {
      if (transaction.getMeta('ownEdit')) return;
      if (editor.state.selection.from !== lastOwnPos.current) {
        store.update(markTyped);
      }
    },
    onUpdate: ({ editor, transaction }) => {
      const json = editor.getJSON();
      const ids = chipIds(json);
      // A chip brought back by Ctrl+Z after the recorder forgot it has no
      // moves to save: take it out again rather than show an empty promise.
      const unknown = ids.find((id) => !store.get().chips[id]);
      if (unknown) {
        const pos = findChip(editor, unknown);
        editor.view.dispatch(
          editor.state.tr
            .delete(pos, pos + 1)
            .setMeta('ownEdit', true)
            .setMeta('addToHistory', false),
        );
        return;
      }
      if (!transaction.getMeta('ownEdit')) store.update(markTyped);
      store.update((s) => syncChips(s, ids));
      latest.current.onSegmentsChange(docToSegments(json, store.get().chips));
      latest.current.onDocChange?.(json);
    },
  });

  // Our edits stay out of the undo history: Ctrl+Z undoes typing, while
  // moves have their own Undo button that keeps the recorder in step.
  const apply = useCallback(
    (edit: Edit) => {
      if (!editor || !edit) return;
      if (edit.kind === 'insert') {
        editor
          .chain()
          .setMeta('ownEdit', true)
          .setMeta('addToHistory', false)
          .insertContent([
            { type: 'moveChip', attrs: { id: edit.id, label: edit.label } },
            { type: 'text', text: ' ' },
          ])
          .run();
      } else {
        const pos = findChip(editor, edit.id);
        if (pos < 0) return;
        const tr =
          edit.kind === 'relabel'
            ? editor.state.tr.setNodeMarkup(pos, undefined, {
                id: edit.id,
                label: edit.label,
              })
            : editor.state.tr.delete(pos, pos + 1);
        editor.view.dispatch(
          tr.setMeta('ownEdit', true).setMeta('addToHistory', false),
        );
      }
      lastOwnPos.current = editor.state.selection.from;
    },
    [editor],
  );

  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (focusTimer.current) clearTimeout(focusTimer.current);
    },
    [],
  );
  const focus = useCallback(() => {
    // The board library hands focus back to the dragged piece a moment
    // after the drop; wait that out before taking it back. The dialog may
    // close in between, so never touch a destroyed editor.
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      if (editor && !editor.isDestroyed) editor.commands.focus();
    }, 120);
  }, [editor]);

  useImperativeHandle(
    ref,
    () => ({
      move(from, to) {
        const result = recordMove(store.get(), from, to);
        if ('error' in result) {
          if (result.error !== 'illegal') setError(result.error);
          return false;
        }
        setError(null);
        store.update(() => result.state);
        apply(result.edit);
        focus();
        return true;
      },
      focus,
    }),
    [store, apply, focus],
  );

  const { state } = store;

  return (
    <div className="flex flex-col gap-2" data-move-editor={scope}>
      {state.active && (
        <style>{`[data-move-editor="${scope}"] [data-chip="${state.active}"] { box-shadow: 0 0 0 2px var(--primary); }`}</style>
      )}
      <EditorContent editor={editor} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={state.cursor.line === null}
          onClick={() => {
            store.update(backToKey);
            setError(null);
            focus();
          }}
        >
          <RotateCcwIcon />
          {t('backToKey')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!canUndo(state)}
          onClick={() => {
            const result = undoMove(store.get());
            store.update(() => result.state);
            apply(result.edit);
            setError(null);
            focus();
          }}
        >
          <Undo2Icon />
          {t('undoMove')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {t(`errors.${error}`, { max: LIMITS[error] })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
    </div>
  );
}
