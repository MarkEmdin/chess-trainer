import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '@/messages/en.json';

// Wraps the rendered component in NextIntlClientProvider with the real `en`
// messages, so `useTranslations` and `useFormatter` return actual strings.
// Importing the JSON keeps tests in sync with the production keys — drop a
// key from messages and the relevant test fails.
export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
