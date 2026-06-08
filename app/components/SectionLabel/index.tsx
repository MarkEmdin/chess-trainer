import { type ReactNode } from 'react';

type Props = {
  label: string;
  children: ReactNode;
};

export default function SectionLabel({ label, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
