import { render, screen } from '@testing-library/react';
import AdminPage from '@/app/[locale]/admin/page';

const redirect = jest.fn(() => {
  // next-intl's redirect throws to stop rendering, like Next's own.
  throw new Error('NEXT_REDIRECT');
});

jest.mock('@/i18n/navigation', () => ({
  redirect: (...args: unknown[]) => redirect(...(args as [])),
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

jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations:
    async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values
        ? `${namespace}.${key}(${Object.values(values).join(',')})`
        : `${namespace}.${key}`,
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

jest.mock('@/app/components/PageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

jest.mock('@/app/components/CoachingAdminCard', () => ({
  __esModule: true,
  default: ({
    request,
    autoOpen,
    viewerId,
  }: {
    autoOpen?: boolean;
    viewerId?: string;
    request: {
      id: string;
      content?: unknown;
      my_student?: boolean;
      assigned_coach?: { first_name: string } | null;
      responses: {
        content?: unknown;
        author?: { first_name: string } | null;
      }[];
    };
  }) => (
    <div
      data-testid="card"
      data-viewer={viewerId}
      data-my-student={String(!!request.my_student)}
      data-assigned-coach={request.assigned_coach?.first_name ?? ''}
      data-author={request.responses[0]?.author?.first_name ?? ''}
      data-autoopen={String(!!autoOpen)}
      data-content={JSON.stringify(request.content ?? null)}
      data-response-content={JSON.stringify(
        request.responses[0]?.content ?? null,
      )}
    >
      {request.id}
    </div>
  ),
}));

const rows = [
  {
    id: 'new-1',
    user_id: 'u1',
    created_at: '2026-10-22T10:00:00Z',
    coaching_responses: [],
  },
  {
    id: 'done-1',
    user_id: 'u1',
    created_at: '2026-10-21T10:00:00Z',
    content: { v: 1, segments: [], lines: {}, drawings: {} },
    coaching_responses: [
      {
        body: 'ok',
        created_at: '2026-10-21T12:00:00Z',
        variation: null,
        author_id: 'c9',
        content: {
          v: 1,
          segments: [{ t: 'text', text: 'ok' }],
          lines: {},
          drawings: {},
        },
      },
    ],
  },
  {
    id: 'new-2',
    user_id: 'u2',
    created_at: '2026-10-20T10:00:00Z',
    coaching_responses: [],
  },
];

let assignments: { student_id: string; coach_id: string }[] = [];

// Chainable stand-in: requests come back from .order(), profiles from .in(),
// assignments from awaiting the select.
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      let excluded: unknown = null;
      const builder = {
        select: () => builder,
        neq: (_col: string, value: unknown) => {
          excluded = value;
          return builder;
        },
        order: async () => ({
          data: rows.filter((r) => r.user_id !== excluded),
        }),
        in: async () => ({
          data:
            table === 'user_profiles'
              ? [{ id: 'u1', nickname: 'alice' }]
              : table === 'coach_profiles'
                ? [
                    {
                      user_id: 'c9',
                      first_name: 'Anna',
                      last_name: 'I',
                      title: 'IM',
                    },
                    {
                      user_id: 'c1',
                      first_name: 'Boris',
                      last_name: 'K',
                      title: 'FM',
                    },
                  ]
                : [],
        }),
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: table === 'coach_students' ? assignments : [] }),
      };
      return builder;
    },
  }),
}));

const render$ = async (tab?: string, request?: string) =>
  render(
    await AdminPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve({
        ...(tab ? { tab } : {}),
        ...(request ? { request } : {}),
      }),
    }),
  );

beforeEach(() => {
  redirect.mockClear();
  assignments = [];
  getAuthedUser.mockResolvedValue({ id: 'c1', role: 'admin' });
});

describe('admin page', () => {
  it.each([
    ['signed out', null],
    ['a regular user', { id: 'u1', role: 'user' }],
  ])('redirects %s to the home page', async (_label, user) => {
    getAuthedUser.mockResolvedValue(user);
    await expect(render$()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('shows new questions by default, with counts on both tabs', async () => {
    await render$();
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'new-1',
      'new-2',
    ]);
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.new(2)' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.answered(1)' }),
    ).toHaveAttribute('href', '/admin?tab=answered');
  });

  it("leaves the viewer's own questions out of the queue", async () => {
    getAuthedUser.mockResolvedValue({ id: 'u2', role: 'admin' });
    await render$();
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'new-1',
    ]);
  });

  it('shows answered questions on the answered tab', async () => {
    await render$('answered');
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'done-1',
    ]);
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.answered(1)' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('passes inline-move content of questions and answers to the cards', async () => {
    await render$('answered');
    const card = screen.getByTestId('card');
    expect(JSON.parse(card.dataset.content!)).toMatchObject({ v: 1 });
    expect(JSON.parse(card.dataset.responseContent!)).toMatchObject({
      segments: [{ t: 'text', text: 'ok' }],
    });
  });

  it('?request=<answered id> selects the answered tab and auto-opens that card', async () => {
    await render$(undefined, 'done-1');
    const cards = screen.getAllByTestId('card');
    expect(cards.map((c) => c.textContent)).toEqual(['done-1']);
    expect(cards[0]).toHaveAttribute('data-autoopen', 'true');
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.answered(1)' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('auto-opens only the requested card', async () => {
    await render$(undefined, 'new-2');
    expect(
      screen
        .getAllByTestId('card')
        .map((c) => [c.textContent, c.dataset.autoopen]),
    ).toEqual([
      ['new-1', 'false'],
      ['new-2', 'true'],
    ]);
  });

  it('?request=<unknown> behaves as today', async () => {
    await render$('answered', 'nope');
    const cards = screen.getAllByTestId('card');
    expect(cards.map((c) => c.textContent)).toEqual(['done-1']);
    expect(cards[0]).toHaveAttribute('data-autoopen', 'false');
  });

  it('overrides an explicit ?tab only when the request matches', async () => {
    await render$('answered', 'new-1');
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'new-1',
      'new-2',
    ]);
  });

  describe('coaches (spec 020)', () => {
    it('opens for a coach', async () => {
      getAuthedUser.mockResolvedValue({ id: 'c5', role: 'coach' });
      await render$();
      expect(redirect).not.toHaveBeenCalled();
      expect(screen.getAllByTestId('card')[0]).toHaveAttribute(
        'data-viewer',
        'c5',
      );
    });

    it("puts a coach's own students first, marked", async () => {
      getAuthedUser.mockResolvedValue({ id: 'c5', role: 'coach' });
      assignments = [{ student_id: 'u2', coach_id: 'c5' }];
      await render$();
      expect(
        screen
          .getAllByTestId('card')
          .map((c) => [c.textContent, c.dataset.myStudent]),
      ).toEqual([
        ['new-2', 'true'],
        ['new-1', 'false'],
      ]);
    });

    it('tells the admin which coach a student has', async () => {
      assignments = [{ student_id: 'u2', coach_id: 'c1' }];
      await render$();
      const cards = screen.getAllByTestId('card');
      expect(cards.map((c) => c.dataset.assignedCoach)).toEqual(['', 'Boris']);
      expect(cards.map((c) => c.dataset.myStudent)).toEqual(['false', 'false']);
    });

    it('attaches the author of each answer', async () => {
      await render$('answered');
      expect(screen.getByTestId('card')).toHaveAttribute('data-author', 'Anna');
    });
  });
});
