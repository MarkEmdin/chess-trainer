import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/[locale]/about/page';

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

describe('about page', () => {
  it('shows the sections in order: why, author, contact, source', async () => {
    render(await AboutPage());
    expect(
      screen.getByRole('heading', { level: 1, name: 'about.title' }),
    ).toBeInTheDocument();
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      'about.why.title',
      'about.author.title',
      'about.contact.title',
      'about.source.title',
    ]);
  });

  it('links the contact email', async () => {
    render(await AboutPage());
    expect(
      screen.getByRole('link', { name: 'chesstrainer.notify@gmail.com' }),
    ).toHaveAttribute('href', 'mailto:chesstrainer.notify@gmail.com');
  });

  it('opens the repository in a new tab', async () => {
    render(await AboutPage());
    const repo = screen.getByRole('link', { name: 'about.source.link' });
    expect(repo).toHaveAttribute(
      'href',
      'https://github.com/MarkEmdin/chess-trainer',
    );
    expect(repo).toHaveAttribute('target', '_blank');
    expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
