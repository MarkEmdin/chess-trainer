import { useRef } from 'react';
import { act, fireEvent, renderWithIntl, screen } from '../../../test-utils';
import MoveEditor, {
  useRecorderStore,
  type MoveEditorApi,
} from '@/app/components/CoachingModal/MoveEditor';
import type { Segment } from '@/lib/coaching/content';
import { initialRecorder } from '@/lib/coaching/moveRecorder';
import type { JSONContent } from '@tiptap/core';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

// ProseMirror measures the caret to scroll it into view; jsdom has no layout.
beforeAll(() => {
  const rect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  });
  Range.prototype.getBoundingClientRect = rect;
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: [][Symbol.iterator],
    }) as unknown as DOMRectList;
  document.elementFromPoint = () => null;
});

function Harness({ onSegments }: { onSegments: (s: Segment[]) => void }) {
  const store = useRecorderStore(FEN);
  const api = useRef<MoveEditorApi>(null);
  return (
    <>
      <MoveEditor
        ref={api}
        store={store}
        label="Your question"
        placeholder="Write here"
        onSegmentsChange={onSegments}
        onFocus={() => {}}
      />
      <button type="button" onClick={() => api.current?.move('d7', 'd6')}>
        fake move
      </button>
      <span data-testid="chip-count">
        {Object.keys(store.state.chips).length}
      </span>
    </>
  );
}

async function renderEditor() {
  const onSegments = jest.fn();
  renderWithIntl(<Harness onSegments={onSegments} />);
  // useEditor creates the editor after the first render.
  await screen.findByRole('textbox', { name: 'Your question' });
  return onSegments;
}

describe('<MoveEditor />', () => {
  it('shows the placeholder in an empty editor', async () => {
    await renderEditor();
    expect(
      document.querySelector('[data-placeholder="Write here"]'),
    ).not.toBeNull();
  });

  it('disables the line buttons before any move', async () => {
    await renderEditor();
    expect(
      screen.getByRole('button', { name: /Back to key position/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo move' })).toBeDisabled();
  });

  it('inserts a chip for a board move', async () => {
    const onSegments = await renderEditor();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'fake move' }));
    });
    expect(document.querySelector('[data-chip]')?.textContent).toBe('3… d6');
    expect(screen.getByTestId('chip-count')).toHaveTextContent('1');
    expect(onSegments).toHaveBeenLastCalledWith([
      { t: 'moves', line: expect.any(String), from: 0, to: 1 },
      { t: 'text', text: ' ' },
    ]);
    expect(screen.getByRole('button', { name: 'Undo move' })).toBeEnabled();
  });

  it('removes the chip on undo', async () => {
    await renderEditor();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'fake move' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo move' }));
    });
    expect(document.querySelector('[data-chip]')).toBeNull();
    expect(screen.getByTestId('chip-count')).toHaveTextContent('0');
  });

  describe('restored draft', () => {
    const recorder = {
      ...initialRecorder(FEN),
      lines: { l1: ['d6'] },
      chips: { c1: { line: 'l1', from: 0, to: 1 } },
      nextId: 2,
      typed: true,
    };
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Maybe ' },
            { type: 'moveChip', attrs: { id: 'c1', label: '3… d6' } },
          ],
        },
      ],
    };

    function Restored({
      onSegments,
      onDoc,
    }: {
      onSegments: (s: Segment[]) => void;
      onDoc: (d: JSONContent) => void;
    }) {
      const store = useRecorderStore(FEN, recorder);
      const api = useRef<MoveEditorApi>(null);
      return (
        <>
          <MoveEditor
            ref={api}
            store={store}
            label="Your question"
            placeholder="Write here"
            initialDoc={doc}
            onSegmentsChange={onSegments}
            onDocChange={onDoc}
            onFocus={() => {}}
          />
          <button type="button" onClick={() => api.current?.move('d7', 'd6')}>
            fake move
          </button>
          <span data-testid="lines">{JSON.stringify(store.state.lines)}</span>
        </>
      );
    }

    it('brings back the text and working chips', async () => {
      const onSegments = jest.fn();
      renderWithIntl(<Restored onSegments={onSegments} onDoc={() => {}} />);
      const box = await screen.findByRole('textbox', { name: 'Your question' });
      expect(box).toHaveTextContent('Maybe 3… d6');
      expect(document.querySelector('[data-chip="c1"]')).not.toBeNull();
      expect(screen.getByTestId('lines')).toHaveTextContent('{"l1":["d6"]}');
      expect(onSegments).toHaveBeenLastCalledWith([
        { t: 'text', text: 'Maybe ' },
        { t: 'moves', line: 'l1', from: 0, to: 1 },
      ]);
    });

    it('reports the document as it changes', async () => {
      const onDoc = jest.fn();
      renderWithIntl(<Restored onSegments={() => {}} onDoc={onDoc} />);
      await screen.findByRole('textbox', { name: 'Your question' });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'fake move' }));
      });
      const last = onDoc.mock.lastCall![0] as JSONContent;
      const chips = last.content![0].content!.filter(
        (n) => n.type === 'moveChip',
      );
      expect(chips).toHaveLength(2);
    });
  });
});
