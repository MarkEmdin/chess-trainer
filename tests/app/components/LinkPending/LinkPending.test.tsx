import { render, screen } from '@testing-library/react';
import LinkPending from '@/app/components/LinkPending';

let pending = false;
jest.mock('next/link', () => ({
  useLinkStatus: () => ({ pending }),
}));

describe('LinkPending', () => {
  it('shows a spinner while the parent link is loading', () => {
    pending = true;
    render(<LinkPending />);
    expect(screen.getByTestId('link-pending')).toBeInTheDocument();
  });

  it('renders nothing otherwise', () => {
    pending = false;
    render(<LinkPending />);
    expect(screen.queryByTestId('link-pending')).not.toBeInTheDocument();
  });
});
