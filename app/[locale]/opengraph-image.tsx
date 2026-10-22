import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

export const alt = 'Chess Fundamentals — learn the basics of chess';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CREAM = '#fdf2f4';
const ROSE = '#e85a72';
const INK = '#1c1517';

// Knight outline from public/pieces/knight.svg, recolored for the dark card.
function Knight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 45 45">
      <g
        fill={CREAM}
        stroke={INK}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0,0.3)"
      >
        <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
        <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
        <path
          d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
          fill={INK}
        />
        <path
          d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z"
          transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
          fill={INK}
        />
      </g>
    </svg>
  );
}

// A thought-bubble dot; the trail runs from the knight up to the cloud.
function Dot({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size,
        background: CREAM,
      }}
    />
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
        color: CREAM,
        fontFamily: 'sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: -120,
          bottom: -90,
        }}
      >
        <Knight size={640} />
      </div>

      <Dot left={792} top={196} size={20} />
      <Dot left={760} top={160} size={30} />
      <div
        style={{
          position: 'absolute',
          left: 690,
          top: 36,
          width: 150,
          height: 112,
          borderRadius: 56,
          background: CREAM,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ROSE,
          fontSize: 84,
          lineHeight: 1,
        }}
      >
        ?
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 16,
          height: '100%',
          background: ROSE,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
          width: 680,
          paddingLeft: 96,
        }}
      >
        <div style={{ fontSize: 30, color: ROSE, letterSpacing: 6 }}>
          CHESS FUNDAMENTALS
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.3 }}>{t('description')}</div>
      </div>
    </div>,
    { ...size },
  );
}
