import { isCoachTitle, type CoachTitle } from './titles';

export const MAX_NAME_LENGTH = 50;
export const MAX_ABOUT_LENGTH = 1000;
export const MAX_HANDLE_LENGTH = 50;

export type ApplicationFields = {
  first_name: string;
  last_name: string;
  title: CoachTitle;
  fide_id: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  about: string;
};

export type ApplicationError =
  | 'required'
  | 'tooLong'
  | 'invalid'
  | 'needAccount';

export type ApplicationErrors = Partial<
  Record<keyof ApplicationFields | 'accounts', ApplicationError>
>;

export type ParsedApplication =
  | { ok: true; fields: ApplicationFields }
  | { ok: false; errors: ApplicationErrors };

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}

// Public coach profile fields: first + last name and title. Used on its own
// for the admin's profile and as part of the application.
export type ProfileFields = Pick<
  ApplicationFields,
  'first_name' | 'last_name' | 'title'
>;

function readProfile(fd: FormData, errors: ApplicationErrors): ProfileFields {
  const name = (key: 'first_name' | 'last_name') => {
    const value = text(fd, key);
    if (!value) errors[key] = 'required';
    else if (value.length > MAX_NAME_LENGTH) errors[key] = 'tooLong';
    return value;
  };
  const first_name = name('first_name');
  const last_name = name('last_name');
  const title = text(fd, 'title');
  if (!isCoachTitle(title)) errors.title = 'invalid';
  return { first_name, last_name, title: title as CoachTitle };
}

export function parseCoachProfile(
  fd: FormData,
):
  | { ok: true; fields: ProfileFields }
  | { ok: false; errors: ApplicationErrors } {
  const errors: ApplicationErrors = {};
  const fields = readProfile(fd, errors);
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, fields };
}

// Coach application form (spec 020).
export function parseApplication(fd: FormData): ParsedApplication {
  const errors: ApplicationErrors = {};
  const profile = readProfile(fd, errors);

  const about = text(fd, 'about');
  if (!about) errors.about = 'required';
  else if (about.length > MAX_ABOUT_LENGTH) errors.about = 'tooLong';

  const fide = text(fd, 'fide_id');
  if (fide && !/^\d{1,12}$/.test(fide)) errors.fide_id = 'invalid';

  const handle = (key: 'chesscom_username' | 'lichess_username') => {
    const value = text(fd, key);
    if (value.length > MAX_HANDLE_LENGTH) errors[key] = 'tooLong';
    return value || null;
  };
  const chesscom_username = handle('chesscom_username');
  const lichess_username = handle('lichess_username');
  if (!chesscom_username && !lichess_username) errors.accounts = 'needAccount';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    fields: {
      ...profile,
      fide_id: fide || null,
      chesscom_username,
      lichess_username,
      about,
    },
  };
}
