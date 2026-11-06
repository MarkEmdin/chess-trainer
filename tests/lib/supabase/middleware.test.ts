import type { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const getSession = jest.fn();
const getUser = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getSession, getUser } }),
}));

describe('updateSession', () => {
  it('refreshes the session without an Auth call on every request', async () => {
    const response = { cookies: { set: jest.fn() } } as unknown as NextResponse;
    const request = { cookies: { getAll: () => [] } } as unknown as NextRequest;

    expect(await updateSession(request, response)).toBe(response);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getUser).not.toHaveBeenCalled();
  });
});
