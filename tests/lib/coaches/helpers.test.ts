import { COACH_TITLES, isCoachTitle } from '@/lib/coaches/titles';
import { coachDisplayName } from '@/lib/coaches/displayName';
import { canSeeRequest } from '@/lib/coaches/visibility';
import { parseApplication } from '@/lib/coaches/application';

describe('coach titles', () => {
  it('lists FIDE titles, Russian titles and no title', () => {
    expect(COACH_TITLES).toEqual([
      'GM',
      'IM',
      'FM',
      'CM',
      'WGM',
      'WIM',
      'WFM',
      'WCM',
      'MS',
      'CMS',
      'cat1',
      'none',
    ]);
  });
  it('rejects unknown titles', () => {
    expect(isCoachTitle('IM')).toBe(true);
    expect(isCoachTitle('XX')).toBe(false);
  });
});

describe('coachDisplayName', () => {
  const label = (t: string) => `<${t}>`;
  it('puts a FIDE title before the name as is', () => {
    expect(
      coachDisplayName(
        { first_name: 'Ivan', last_name: 'Petrov', title: 'IM' },
        label,
      ),
    ).toBe('IM Ivan Petrov');
  });
  it('omits "no title"', () => {
    expect(
      coachDisplayName(
        { first_name: 'Ivan', last_name: 'Petrov', title: 'none' },
        label,
      ),
    ).toBe('Ivan Petrov');
  });
  it('uses the translated label for national titles', () => {
    expect(
      coachDisplayName(
        { first_name: 'Ivan', last_name: 'Petrov', title: 'CMS' },
        label,
      ),
    ).toBe('<CMS> Ivan Petrov');
  });
});

describe('canSeeRequest', () => {
  const coachOf = new Map([['s1', 'coachA']]);
  it('lets the asker see their own question', () => {
    expect(canSeeRequest({ id: 'u', role: 'user' }, 'u', coachOf)).toBe(true);
  });
  it('lets the admin see everything', () => {
    expect(canSeeRequest({ id: 'a', role: 'admin' }, 's1', coachOf)).toBe(true);
  });
  it('lets any coach see a student without a coach', () => {
    expect(canSeeRequest({ id: 'coachB', role: 'coach' }, 's2', coachOf)).toBe(
      true,
    );
  });
  it('lets a coach see their own student', () => {
    expect(canSeeRequest({ id: 'coachA', role: 'coach' }, 's1', coachOf)).toBe(
      true,
    );
  });
  it("hides another coach's student", () => {
    expect(canSeeRequest({ id: 'coachB', role: 'coach' }, 's1', coachOf)).toBe(
      false,
    );
  });
  it('hides other questions from a student', () => {
    expect(canSeeRequest({ id: 'u', role: 'user' }, 's2', coachOf)).toBe(false);
  });
});

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = {
  first_name: ' Ivan ',
  last_name: 'Petrov',
  title: 'IM',
  fide_id: '',
  chesscom_username: 'ivan',
  lichess_username: '',
  about: 'I coach juniors.',
};

describe('parseApplication', () => {
  it('trims fields and turns empty optionals into null', () => {
    expect(parseApplication(form(valid))).toEqual({
      ok: true,
      fields: {
        first_name: 'Ivan',
        last_name: 'Petrov',
        title: 'IM',
        fide_id: null,
        chesscom_username: 'ivan',
        lichess_username: null,
        about: 'I coach juniors.',
      },
    });
  });
  it('requires a first name', () => {
    expect(parseApplication(form({ ...valid, first_name: ' ' }))).toEqual({
      ok: false,
      errors: { first_name: 'required' },
    });
  });
  it('limits names to 50 characters', () => {
    expect(
      parseApplication(form({ ...valid, last_name: 'x'.repeat(51) })),
    ).toEqual({ ok: false, errors: { last_name: 'tooLong' } });
  });
  it('accepts only digits in the FIDE ID', () => {
    expect(parseApplication(form({ ...valid, fide_id: '12a' }))).toEqual({
      ok: false,
      errors: { fide_id: 'invalid' },
    });
  });
  it('needs at least one chess account', () => {
    expect(
      parseApplication(form({ ...valid, chesscom_username: '' })),
    ).toEqual({ ok: false, errors: { accounts: 'needAccount' } });
  });
  it('rejects an unknown title', () => {
    expect(parseApplication(form({ ...valid, title: 'XX' }))).toEqual({
      ok: false,
      errors: { title: 'invalid' },
    });
  });
  it('limits "about" to 1000 characters', () => {
    expect(
      parseApplication(form({ ...valid, about: 'x'.repeat(1001) })),
    ).toEqual({ ok: false, errors: { about: 'tooLong' } });
  });
});
