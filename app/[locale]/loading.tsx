import { Loader2Icon } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <Loader2Icon
        aria-hidden
        className="size-8 animate-spin text-muted-foreground"
      />
    </div>
  );
}
