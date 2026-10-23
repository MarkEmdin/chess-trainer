import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, within } from '@/tests/test-utils';
import NotificationBell from '@/app/components/NotificationBell';

jest.mock('next-intl/server', () => ({
  getTranslations:
    async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values
        ? `${namespace}.${key}(${Object.values(values).join(',')})`
        : `${namespace}.${key}`,
}));

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

const getNotificationCounts = jest.fn();
jest.mock('@/lib/coaching/getNotificationCounts', () => ({
  getNotificationCounts: () => getNotificationCounts(),
}));

const student = { id: 'u1', role: 'user' };
const admin = { id: 'a1', role: 'admin' };

async function renderBell() {
  const ui = await NotificationBell();
  return renderWithIntl(<>{ui}</>);
}

describe('<NotificationBell />', () => {
  it('renders nothing when signed out', async () => {
    getAuthedUser.mockResolvedValue(null);
    const { container } = await renderBell();
    expect(container).toBeEmptyDOMElement();
  });

  it('links a student to their answered questions, with no badge at zero', async () => {
    getAuthedUser.mockResolvedValue(student);
    getNotificationCounts.mockResolvedValue({
      unseenAnswers: 0,
      newQuestions: null,
    });
    await renderBell();
    const link = screen.getByRole('link', {
      name: 'notifications.bellLabelStudent(0)',
    });
    expect(link).toHaveAttribute('href', '/coaching?tab=answered');
    expect(link).toHaveTextContent('');
  });

  it.each([
    [3, '3'],
    [12, '9+'],
  ])('shows %i unseen answers as %s', async (n, text) => {
    getAuthedUser.mockResolvedValue(student);
    getNotificationCounts.mockResolvedValue({
      unseenAnswers: n,
      newQuestions: null,
    });
    await renderBell();
    expect(screen.getByRole('link')).toHaveTextContent(text);
  });

  it('gives an admin a menu with both counts', async () => {
    getAuthedUser.mockResolvedValue(admin);
    getNotificationCounts.mockResolvedValue({
      unseenAnswers: 1,
      newQuestions: 3,
    });
    await renderBell();
    const trigger = screen.getByRole('button', {
      name: 'notifications.bellLabel(1,3)',
    });
    expect(within(trigger).getByText('3')).toHaveClass('bg-green-600');
    expect(within(trigger).getByText('1')).toHaveClass('bg-destructive');

    await userEvent.click(trigger);
    const questions = screen.getByRole('menuitem', {
      name: /New student questions/,
    });
    expect(questions).toHaveAttribute('href', '/admin');
    expect(questions).toHaveTextContent('3');
    const answers = screen.getByRole('menuitem', {
      name: /Answers to my questions/,
    });
    expect(answers).toHaveAttribute('href', '/coaching?tab=answered');
    expect(answers).toHaveTextContent('1');
  });

  it('keeps both rows for an admin with no new questions', async () => {
    getAuthedUser.mockResolvedValue(admin);
    getNotificationCounts.mockResolvedValue({
      unseenAnswers: 0,
      newQuestions: 0,
    });
    await renderBell();
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('');
    await userEvent.click(trigger);
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });
});
