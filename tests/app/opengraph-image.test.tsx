import { generateStaticParams } from '@/app/[locale]/opengraph-image';

jest.mock('next/og', () => ({ ImageResponse: jest.fn() }));

describe('opengraph image', () => {
  it('is prerendered for every locale so previews load from the CDN', () => {
    expect(generateStaticParams()).toEqual([
      { locale: 'en' },
      { locale: 'ru' },
    ]);
  });
});
