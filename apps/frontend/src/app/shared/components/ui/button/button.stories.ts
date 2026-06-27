import type { Meta, StoryObj } from '@storybook/angular';

import { ButtonComponent } from './button.component';
import { argsToTemplate } from '@storybook/angular';

type ButtonStory = ButtonComponent & { label?: string };

const meta: Meta<ButtonStory> = {
  component: ButtonComponent,
  render: ({ label, ...args }) => ({
    props: args,
    template: `
    <app-button ${argsToTemplate(args)}>
      ${label}
    </app-button>`,
  }),
  args: {
    color: 'primary',
    disabled: false,
    label: 'Continuar',
    size: 'medium',
    typeColor: 'filled',
  },
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'customer', 'provider', 'light'],
    },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    typeColor: { control: 'select', options: ['filled', 'outline'] },
  },
};

export default meta;

type Story = StoryObj<ButtonStory>;

export const Primary: Story = {
  args: {
    label: 'Continuar',
  },
};

export const Outline: Story = {
  args: {
    label: 'Ver detalhes',
    typeColor: 'outline',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Indisponível',
  },
};
