/** Allows same-app destinations needed by email links and protected-route returns. */
export function safeReturnUrl(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return null;
  const path = value.split(/[?#]/, 1)[0];
  if (path.startsWith('/authenticate')) return null;
  if (/^\/orders\/[1-9]\d*(?:\/(?:review|confirm|payment|finish|report-problem))?$/.test(path)) return value;
  if (/^\/general\/[1-9]\d+\/(?:home|history|addresses|profile(?:\/(?:view|edit))?)$/.test(path)) return value;
  if (/^\/(?:customer|provider)(?:\/[^?#]*)?$/.test(path)) return value;
  return null;
}
