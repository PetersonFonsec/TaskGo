export {};

declare global {
  namespace Cypress {
    interface Chainable {
      findByRole(role: string, options?: { name?: string | RegExp }): Chainable;
      findByLabelText(label: string | RegExp): Chainable;
      findByText(text: string | RegExp): Chainable;
    }
  }
}

Cypress.Commands.add('findByRole', (role: string, options?: { name?: string | RegExp }) => {
  const selector = selectorForRole(role);

  return cy.get(selector).filter((_, element) => {
    if (!options?.name) {
      return true;
    }

    const name = accessibleName(element);
    return typeof options.name === 'string' ? name === options.name : options.name.test(name);
  });
});

Cypress.Commands.add('findByLabelText', (label: string | RegExp) => {
  return cy.get('label,[aria-label]').then(($elements) => {
    const element = [...$elements].find((candidate) => matchesText(accessibleName(candidate), label));

    if (!element) {
      throw new Error(`Unable to find label ${label.toString()}`);
    }

    if (element.hasAttribute('aria-label')) {
      return cy.wrap(element);
    }

    const htmlFor = element.getAttribute('for');
    if (htmlFor) {
      return cy.get(`#${CSS.escape(htmlFor)}`);
    }

    const control = element.querySelector('input,textarea,select,button');
    if (!control) {
      throw new Error(`Label ${label.toString()} has no form control`);
    }

    return cy.wrap(control);
  });
});

Cypress.Commands.add('findByText', (text: string | RegExp) => {
  return cy.contains(text);
});

function selectorForRole(role: string): string {
  if (role === 'button') return 'button,[role="button"]';
  if (role === 'link') return 'a,[role="link"]';
  if (role === 'heading') return 'h1,h2,h3,h4,h5,h6,[role="heading"]';
  return `[role="${role}"]`;
}

function accessibleName(element: Element): string {
  return (
    element.getAttribute('aria-label') ||
    element.textContent?.replace(/\s+/g, ' ').trim() ||
    ''
  );
}

function matchesText(value: string, expected: string | RegExp): boolean {
  return typeof expected === 'string' ? value === expected : expected.test(value);
}
