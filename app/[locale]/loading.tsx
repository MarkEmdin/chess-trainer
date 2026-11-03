import Spinner from '@/app/components/Spinner';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  );
}
