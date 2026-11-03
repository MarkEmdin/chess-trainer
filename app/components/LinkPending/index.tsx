'use client';

import { useLinkStatus } from 'next/link';
import Spinner from '@/app/components/Spinner';

// Spinner shown inside a <Link> while its page is loading (spec 021), so a
// click on a slow tab or nav link is visibly taken. Put it as a child of the
// link.
export default function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span data-testid="link-pending" className={className}>
      <Spinner className="size-3.5" />
    </span>
  );
}
