import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, within } from '@/tests/test-utils';
import {
  ApplicationCard,
  CoachCard,
  MyCoachProfileForm,
} from '@/app/components/CoachManagement';

const actions = {
  approveApplication: jest.fn(),
  rejectApplication: jest.fn(),
  assignStudent: jest.fn(),
  unassignStudent: jest.fn(),
  revokeCoach: jest.fn(),
  saveMyCoachProfile: jest.fn(),
};
jest.mock('@/lib/coaches/actions', () => ({
  approveApplication: (_: unknown, fd: FormData) =>
    actions.approveApplication(Object.fromEntries(fd)),
  rejectApplication: (_: unknown, fd: FormData) =>
    actions.rejectApplication(Object.fromEntries(fd)),
  assignStudent: (_: unknown, fd: FormData) =>
    actions.assignStudent(Object.fromEntries(fd)),
  unassignStudent: (_: unknown, fd: FormData) =>
    actions.unassignStudent(Object.fromEntries(fd)),
  revokeCoach: (_: unknown, fd: FormData) =>
    actions.revokeCoach(Object.fromEntries(fd)),
  saveMyCoachProfile: (_: unknown, fd: FormData) =>
    actions.saveMyCoachProfile(Object.fromEntries(fd)),
}));

beforeEach(() => {
  Object.values(actions).forEach((a) =>
    a.mockReset().mockResolvedValue(undefined),
  );
});

const application = {
  id: 'app1',
  nickname: 'kid',
  created_at: '2026-11-03T10:00:00Z',
  first_name: 'Ivan',
  last_name: 'Petrov',
  title: 'IM' as const,
  fide_id: '4100018',
  chesscom_username: 'ivan',
  lichess_username: null,
  about: 'I coach juniors.',
};

describe('<ApplicationCard />', () => {
  it('shows every field of the application', () => {
    renderWithIntl(<ApplicationCard application={application} />);
    expect(screen.getByText('IM Ivan Petrov')).toBeInTheDocument();
    expect(screen.getByText(/@kid/)).toBeInTheDocument();
    expect(screen.getByText('4100018')).toBeInTheDocument();
    expect(screen.getByText('ivan')).toBeInTheDocument();
    expect(screen.getByText('I coach juniors.')).toBeInTheDocument();
  });

  it('approves and rejects by id', async () => {
    renderWithIntl(<ApplicationCard application={application} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(actions.approveApplication).toHaveBeenCalledWith({
      application_id: 'app1',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(actions.rejectApplication).toHaveBeenCalledWith({
      application_id: 'app1',
    });
  });

  it('shows an action error', async () => {
    actions.approveApplication.mockResolvedValue({ error: 'Not found.' });
    renderWithIntl(<ApplicationCard application={application} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not found.');
  });
});

const coach = {
  id: 'c1',
  nickname: 'coachA',
  profile: { first_name: 'Anna', last_name: 'Ivanova', title: 'WFM' as const },
  students: [{ id: 's1', nickname: 'kid' }],
};

describe('<CoachCard />', () => {
  it('lists the students with an unassign button', async () => {
    renderWithIntl(<CoachCard coach={coach} />);
    expect(screen.getByText('WFM Anna Ivanova')).toBeInTheDocument();
    expect(screen.getByText('Students (1)')).toBeInTheDocument();
    const row = screen.getByText('@kid').closest('li')!;
    await userEvent.click(
      within(row).getByRole('button', { name: 'Unassign' }),
    );
    expect(actions.unassignStudent).toHaveBeenCalledWith({ student_id: 's1' });
  });

  it('assigns a student by nickname and shows the error', async () => {
    actions.assignStudent.mockResolvedValue({ error: 'No user.' });
    renderWithIntl(<CoachCard coach={coach} />);
    await userEvent.type(
      screen.getByLabelText('Assign a student by nickname'),
      'newkid',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));
    expect(actions.assignStudent).toHaveBeenCalledWith({
      coach_id: 'c1',
      nickname: 'newkid',
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('No user.');
  });

  it('asks for a second click before revoking the role', async () => {
    renderWithIntl(<CoachCard coach={{ ...coach, students: [] }} />);
    expect(screen.getByText(/No students assigned/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Revoke coach role' }),
    );
    expect(actions.revokeCoach).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Yes, revoke the role' }),
    );
    expect(actions.revokeCoach).toHaveBeenCalledWith({ coach_id: 'c1' });
  });

  it('falls back to the nickname when the coach has no profile', () => {
    renderWithIntl(<CoachCard coach={{ ...coach, profile: null }} />);
    expect(
      screen.getByRole('heading', { name: '@coachA' }),
    ).toBeInTheDocument();
  });
});

describe('<MyCoachProfileForm />', () => {
  it('saves the prefilled profile', async () => {
    actions.saveMyCoachProfile.mockResolvedValue({ success: true });
    renderWithIntl(
      <MyCoachProfileForm
        initial={{ first_name: 'Mark', last_name: 'Emdin', title: 'none' }}
      />,
    );
    expect(screen.getByLabelText('First name')).toHaveValue('Mark');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(actions.saveMyCoachProfile).toHaveBeenCalledWith({
      first_name: 'Mark',
      last_name: 'Emdin',
      title: 'none',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
  });
});
