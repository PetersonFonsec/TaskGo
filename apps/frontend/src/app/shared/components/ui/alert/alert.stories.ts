import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { AlertComponent } from './alert.component';

type AlertStory = AlertComponent & { label?: string };


const meta: Meta<AlertStory> = {
  component: AlertComponent,
  render: ({ label, ...args }) => ({
    props: args,
    template: `
    <div style="max-width: 200px; margin: 20px auto;">
    <alert ${argsToTemplate(args)}>
      ${label}
    </alert>
    </div>
    `,
  }),

};

export default meta;

type Story = StoryObj<AlertStory>;

export const Primary: Story = {
  args: {
    label: "Peterson",
  },
};
