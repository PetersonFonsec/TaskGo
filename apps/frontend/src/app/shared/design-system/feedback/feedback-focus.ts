/** Candidatos locais ao feedback; a disponibilidade é conferida no DOM renderizado. */
export const FEEDBACK_FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

export function availableFeedbackFocus(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  return element.isConnected &&
    !element.closest('[hidden], [inert], [aria-hidden="true"], dialog:not([open])') &&
    !element.matches(':disabled, input[type="hidden"]') &&
    element.getClientRects().length > 0 &&
    !!view && view.getComputedStyle(element).visibility === 'visible';
}
