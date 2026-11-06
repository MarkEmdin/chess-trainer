import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/[locale]/about/page';

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

jest.mock('@/app/components/ChessboardWithNotation', () => ({
  __esModule: true,
  default: () => <div data-testid="board" />,
}));

jest.mock('@/app/components/LineDemo', () => ({
  __esModule: true,
  default: () => <div data-testid="line-demo" />,
}));

describe('about page', () => {
  it('shows the sections in order: why, features, author, contact, source', async () => {
    render(await AboutPage());
    expect(
      screen.getByRole('heading', { level: 1, name: 'about.title' }),
    ).toBeInTheDocument();
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      'about.why.title',
      'about.features.title',
      'about.author.title',
      'about.contact.title',
      'about.source.title',
    ]);
  });

  it('shows the features on example boards', async () => {
    render(await AboutPage());
    expect(screen.getAllByTestId('line-demo')).toHaveLength(2);
    expect(screen.getAllByTestId('board')).toHaveLength(1);
  });

  it('says that moves on the board go into the text', async () => {
    render(await AboutPage());
    expect(
      screen.getByText('about.features.items.moves.title'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('about.features.items.moves.text'),
    ).toBeInTheDocument();
    expect(screen.getByText('about.features.items.feedback.title'));
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
