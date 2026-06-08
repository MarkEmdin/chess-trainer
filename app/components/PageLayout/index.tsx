import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  maxWidth?: '2xl' | '3xl';
  children: ReactNode;
};

export default function PageLayout({
  title,
  subtitle,
  maxWidth = '3xl',
  children,
}: Props) {
  return (
    <main
      className={cn(
        'mx-auto px-6 py-12 flex flex-col gap-6',
        maxWidth === '2xl' ? 'max-w-2xl' : 'max-w-3xl',
      )}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {children}
    </main>
  );
}
