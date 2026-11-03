import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

// The one loading indicator used across the app (spec 021).
export default function Spinner({ className }: { className?: string }) {
  return (
    <Loader2Icon aria-hidden className={cn('size-4 animate-spin', className)} />
  );
}
