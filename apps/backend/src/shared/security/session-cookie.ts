import type { Request, Response } from 'express';
export const CUSTOMER_COOKIE = 'taskgo_session';
export const ADMIN_COOKIE = 'taskgo_admin_session';
export function readSessionCookie(
  request: Pick<Request, 'headers'>,
  name: string,
): string | undefined {
  const cookies = request.headers?.cookie;
  if (!cookies) return undefined;
  const entry = cookies
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return undefined;
  }
}
export function writeSessionCookie(
  response: Response,
  token: string,
  admin = false,
) {
  response.cookie(admin ? ADMIN_COOKIE : CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });
  response.setHeader('Cache-Control', 'no-store');
}
export function clearSessionCookie(response: Response, admin = false) {
  response.clearCookie(admin ? ADMIN_COOKIE : CUSTOMER_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  response.setHeader('Cache-Control', 'no-store');
}
