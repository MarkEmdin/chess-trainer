import { getTranslations } from 'next-intl/server';

// A database or Auth failure the user can't act on. The raw text goes to the
// server log; the form shows one translated line (spec 030).
export async function serverError(
  context: string,
  error: { message: string },
): Promise<{ error: string }> {
  console.error(context, error.message);
  const t = await getTranslations('common');
  return { error: t('serverError') };
}
