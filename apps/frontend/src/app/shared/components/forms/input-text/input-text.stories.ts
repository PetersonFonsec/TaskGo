import type { Meta, StoryObj } from '@storybook/angular';

import { InputTextComponent, InputTextTypes } from './input-text.component';
import { argsToTemplate } from '@storybook/angular';

type InputTextStory = InputTextComponent;

const meta: Meta<InputTextStory> = {
  component: InputTextComponent,
};

export default meta;

type Story = StoryObj<InputTextStory>;

export const Primary: Story = {
  args: {
    label: "Name",
  },
};

export const Password: Story = {
  args: {
    label: "Password",
    type: InputTextTypes.password
  },
};
