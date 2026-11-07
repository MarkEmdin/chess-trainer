import { ImageResponse } from 'next/og';
import KnightMark from '@/app/components/KnightMark';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f1115',
          borderRadius: 7,
        }}
      >
        <KnightMark size={27} color="#6fcf97" eye="#0f1115" />
      </div>
    ),
    { ...size },
  );
}
