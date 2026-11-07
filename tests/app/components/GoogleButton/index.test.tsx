import { renderWithIntl, screen } from '@/tests/test-utils';
import GoogleButton from '@/app/components/GoogleButton';

jest.mock('@/lib/auth/actions', () => ({ signInWithGoogle: jest.fn() }));

describe('<GoogleButton />', () => {
  it('offers Google sign-in', () => {
    renderWithIntl(<GoogleButton />);
    expect(
      screen.getByRole('button', { name: /continue with google/i }),
    ).toBeEnabled();
  });
});
