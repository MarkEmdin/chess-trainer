import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

export const alt = 'Chess Fundamentals — learn the basics of chess';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const squares = Array.from({ length: 8 * 16 }, (_, i) => {
    const row = Math.floor(i / 16);
    const col = i % 16;
    return (row + col) % 2 === 0;
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, #1c1517 0%, #3a1f25 55%, #5c2a36 100%)',
          color: '#fdf2f4',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              fontSize: 128,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            Chess Fundamentals
          </div>
          <div
            style={{
              fontSize: 40,
              opacity: 0.85,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {t('description')}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              width: 160,
              height: 80,
              borderRadius: 6,
              overflow: 'hidden',
              border: '2px solid rgba(253, 242, 244, 0.25)',
            }}
          >
            {squares.map((light, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  background: light
                    ? 'rgba(253, 242, 244, 0.9)'
                    : 'rgba(232, 90, 114, 0.85)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
