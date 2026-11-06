import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import FeedbackDialog from '@/app/components/FeedbackDialog';

export default async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t border-border bg-card lg:sticky lg:bottom-0 lg:z-30">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <span>© {new Date().getFullYear()} Chess Fundamentals</span>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          <FeedbackDialog />
          <Link
            href="/tutorial"
            className="hover:text-foreground transition-colors"
          >
            {t('tutorial')}
          </Link>
          <Link
            href="/about"
            className="hover:text-foreground transition-colors"
          >
            {t('about')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
