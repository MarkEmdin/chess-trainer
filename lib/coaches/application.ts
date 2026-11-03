import { isCoachTitle, type CoachTitle } from './titles';

export const MAX_NAME_LENGTH = 50;
export const MAX_ABOUT_LENGTH = 1000;
const MAX_HANDLE_LENGTH = 50;

export type ApplicationFields = {
  first_name: string;
  last_name: string;
  title: CoachTitle;
  fide_id: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  about: string;
};

export type ApplicationError = 'required' | 'tooLong' | 'invalid' | 'needAccount';

export type ApplicationErrors = Partial<
  Record<keyof ApplicationFields | 'accounts', ApplicationError>
>;

export type ParsedApplication =
  | { ok: true; fields: ApplicationFields }
  | { ok: false; errors: ApplicationErrors };

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}

// Coach application form (spec 020). The same shape is the admin's own
// coach profile minus the optional fields.
export function parseApplication(fd: FormData): ParsedApplication {
  const errors: ApplicationErrors = {};

  const required = (key: 'first_name' | 'last_name' | 'about', max: number) => {
    const value = text(fd, key);
    if (!value) errors[key] = 'required';
    else if (value.length > max) errors[key] = 'tooLong';
    return value;
  };
  const optional = (key: 'chesscom_username' | 'lichess_username') => {
    const value = text(fd, key);
    if (value.length > MAX_HANDLE_LENGTH) errors[key] = 'tooLong';
    return value || null;
  };

  const first_name = required('first_name', MAX_NAME_LENGTH);
  const last_name = required('last_name', MAX_NAME_LENGTH);
  const about = required('about', MAX_ABOUT_LENGTH);

  const title = text(fd, 'title');
  if (!isCoachTitle(title)) errors.title = 'invalid';

  const fide = text(fd, 'fide_id');
  if (fide && !/^\d{1,12}$/.test(fide)) errors.fide_id = 'invalid';

  const chesscom_username = optional('chesscom_username');
  const lichess_username = optional('lichess_username');
  if (!chesscom_username && !lichess_username) errors.accounts = 'needAccount';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    fields: {
      first_name,
      last_name,
      title: title as CoachTitle,
      fide_id: fide || null,
      chesscom_username,
      lichess_username,
      about,
    },
  };
}
