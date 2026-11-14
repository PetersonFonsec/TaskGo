import type { StorybookConfig } from '@storybook/angular';

// Storybook 10 já traz controles, ações, viewport e fundos no núcleo.
// Os addons antigos listados aqui não estavam instalados e quebravam o build.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|mdx)'],
  addons: [],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};
export default config;
