import { render, screen } from '@testing-library/react';
import TutorialPage from '@/app/[locale]/tutorial/page';

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/app/components/LineDemo', () => ({
  __esModule: true,
  default: () => <div data-testid="line-demo" />,
}));

describe('tutorial page', () => {
  it('walks through asking a question in order', async () => {
    render(await TutorialPage());
    const steps = screen
      .getAllByRole('listitem')
      .map((li) => li.querySelector('h3')?.textContent)
      .filter(Boolean);
    expect(steps).toEqual([
      'tutorial.ask.steps.find.title',
      'tutorial.ask.steps.write.title',
      'tutorial.ask.steps.moves.title',
      'tutorial.ask.steps.continue.title',
      'tutorial.ask.steps.newLine.title',
      'tutorial.ask.steps.send.title',
    ]);
  });

  it('covers the phone, reading an answer and coaches', async () => {
    render(await TutorialPage());
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'tutorial.ask.title',
      'tutorial.phone.title',
      'tutorial.answer.title',
      'tutorial.coach.title',
    ]);
  });

  it('has examples to step through', async () => {
    render(await TutorialPage());
    expect(screen.getAllByTestId('line-demo')).toHaveLength(2);
  });

  it('sends the reader to the positions', async () => {
    render(await TutorialPage());
    expect(screen.getByRole('link', { name: 'tutorial.cta' })).toHaveAttribute(
      'href',
      '/think-time',
    );
  });
});
