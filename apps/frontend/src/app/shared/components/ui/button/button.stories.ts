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

};

export default meta;

type Story = StoryObj<ButtonStory>;

export const Primary: Story = {
  args: {
    label: "Peterson",
  },
};
