import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import KnightMark from '@/app/components/KnightMark';

export const alt = 'Chess Fundamentals — a real coach reviews your games';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LIGHT = '#e8eaed';
const MUTED = '#9aa3ae';
const ACCENT = '#6fcf97';
const INK = '#0f1115';
const SQUARE_DARK = '#171a20';
const SQUARE_LIGHT = '#232833';
const SQUARE = 105;
const COLS = 5;
const ROWS = 6;
const FROM = { col: 1, row: 3 };
const TO = { col: 2, row: 1 };

function Board() {
  const squares = Array.from({ length: COLS * ROWS }, (_, i) => ({
    col: i % COLS,
    row: Math.floor(i / COLS),
  }));

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: SQUARE * COLS,
        height: SQUARE * ROWS,
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      {squares.map(({ col, row }) => {
        const isTo = col === TO.col && row === TO.row;
        const marked = isTo || (col === FROM.col && row === FROM.row);
        const light = (col + row) % 2 === 0;
        return (
          <div
            key={`${col}-${row}`}
            style={{
              width: SQUARE,
              height: SQUARE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: marked
                ? 'rgba(111, 207, 151, 0.35)'
                : light
                  ? SQUARE_LIGHT
                  : SQUARE_DARK,
            }}
          >
            {isTo && <KnightMark size={88} color={LIGHT} eye={INK} />}
          </div>
        );
      })}
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: INK,
        color: LIGHT,
        fontFamily: 'sans-serif',
        overflow: 'hidden',
      }}
    >
      <Board />

      <div
        style={{
          position: 'absolute',
          right: 32,
          bottom: 36,
          width: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '20px 24px',
          borderRadius: 14,
          background: INK,
          border: `2px solid ${ACCENT}`,
        }}
      >
        <div style={{ fontSize: 22, color: ACCENT }}>{t('ogCoachLabel')}</div>
        <div style={{ fontSize: 27, lineHeight: 1.3 }}>{t('ogCoachLine')}</div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: 675,
          height: '100%',
          padding: '0 56px 0 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 30,
            color: ACCENT,
          }}
        >
          <KnightMark size={40} color={ACCENT} eye={INK} />
          Chess Fundamentals
        </div>
        <div style={{ marginTop: 44, fontSize: 66, lineHeight: 1.12 }}>
          {t('ogTitle')}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            lineHeight: 1.35,
            color: MUTED,
          }}
        >
          {t('ogSubtitle')}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
