import type { Decorator, Preview } from '@storybook/angular';

type Theme = 'CUSTOMER' | 'PROVIDER';

// Mesmo mecanismo do app (ThemeService): data-theme no <html>.
const withTheme: Decorator = (story, context) => {
  const theme = (context.globals['theme'] as Theme) ?? 'CUSTOMER';
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.background = 'var(--tg-bg-canvas)';
  root.style.minHeight = '100%';
  document.body.style.background = 'transparent';
  document.body.style.color = 'var(--tg-text-primary)';
  return story();
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Modo do produto',
      toolbar: {
        title: 'Modo',
        icon: 'paintbrush',
        items: [
          { value: 'CUSTOMER', title: 'Cliente (claro)' },
          { value: 'PROVIDER', title: 'Prestador (escuro)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'CUSTOMER',
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Fundamentos', ['Cor', 'Tipografia', 'Espaço e forma'], '*'],
      },
    },
  },
};

export default preview;
