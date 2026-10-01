export function sessionToken(response: {
  body: { access_token?: string };
  headers: Record<string, any>;
}) {
  expect(response.body.access_token).toBe('');
  const cookies: string[] = response.headers['set-cookie'] ?? [];
  const session = cookies.find((cookie) =>
    /^taskgo_(?:admin_)?session=/.test(cookie),
  );
  expect(session).toMatch(/HttpOnly/i);
  if (!session) throw new Error('Expected an HttpOnly session cookie');
  return decodeURIComponent(
    session.split(';')[0].slice(session.indexOf('=') + 1),
  );
}
