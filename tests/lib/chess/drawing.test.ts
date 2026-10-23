import { drawingSquareStyles, mergeSquareStyles } from '@/lib/chess/drawing';

describe('drawingSquareStyles', () => {
  it('rings a circled square without touching its colour', () => {
    const styles = drawingSquareStyles({ arrows: [], circles: ['e4'] });
    expect(styles.e4.backgroundImage).toContain('radial-gradient');
    expect(styles.e4.backgroundColor).toBeUndefined();
    expect(styles.e4.background).toBeUndefined();
  });

  it('styles nothing without circles', () => {
    expect(
      drawingSquareStyles({ arrows: [['e2', 'e4']], circles: [] }),
    ).toEqual({});
  });
});

describe('mergeSquareStyles', () => {
  it('keeps every style set on the same square', () => {
    expect(
      mergeSquareStyles({ e4: { backgroundColor: 'y' } }, undefined, {
        e4: { backgroundImage: 'r' },
        d4: { opacity: 1 },
      }),
    ).toEqual({
      e4: { backgroundColor: 'y', backgroundImage: 'r' },
      d4: { opacity: 1 },
    });
  });
});
