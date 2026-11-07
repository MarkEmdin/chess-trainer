import { render, screen, within } from '@testing-library/react';
import WorldChampionsPage from '@/app/[locale]/lessons/world-champions/page';
import { worldChampions } from '@/app/constants/worldChampions';

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

jest.mock('@/app/components/VideoModal', () => ({
  __esModule: true,
  default: () => <button>video</button>,
}));

describe('world champions page', () => {
  it('numbers the champions in title order', async () => {
    render(await WorldChampionsPage());
    expect(
      screen.getByText('1. champions.list.steinitz.name'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('13. champions.list.kasparov.name'),
    ).toBeInTheDocument();
  });

  it('has a photo for each of the 13 champions', () => {
    expect(worldChampions).toHaveLength(13);
    worldChampions.forEach((champion) => {
      expect(champion.photo).toBe(`/champions/${champion.id}.webp`);
    });
  });

  it('credits every photo with a link to its source', async () => {
    render(await WorldChampionsPage());
    const credits = within(
      screen.getByRole('region', { name: 'champions.photoCredits' }),
    );
    expect(credits.getAllByRole('link', { name: /wikimedia/i })).toHaveLength(
      13,
    );
    expect(
      credits.getByRole('link', { name: 'CC BY-SA 4.0' }),
    ).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0/',
    );
  });

  it('lists Spassky as no longer living', () => {
    const spassky = worldChampions.find(({ id }) => id === 'spassky');
    expect(spassky?.years).toBe('1937–2025');
  });
});
