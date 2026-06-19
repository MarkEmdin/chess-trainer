import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const squares = Array.from({ length: 6 * 6 }, (_, i) => {
    const row = Math.floor(i / 6);
    const col = i % 6;
    return (row + col) % 2 === 0;
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          background: '#1c1517',
          padding: 18,
        }}
      >
        {squares.map((light, i) => (
          <div
            key={i}
            style={{
              width: `${100 / 6}%`,
              height: `${100 / 6}%`,
              background: light ? '#fdf2f4' : '#e85a72',
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
