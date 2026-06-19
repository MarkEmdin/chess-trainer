import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const squares = Array.from({ length: 4 * 4 }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
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
        }}
      >
        {squares.map((light, i) => (
          <div
            key={i}
            style={{
              width: '25%',
              height: '25%',
              background: light ? '#fdf2f4' : '#e85a72',
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
