import type { Meta, StoryObj } from '@storybook/angular';

import { InputUploadComponent } from './input-upload.component';
type InputPhotoStory = InputUploadComponent;

const meta: Meta<InputPhotoStory> = {
  component: InputUploadComponent,
};

export default meta;

type Story = StoryObj<InputPhotoStory>;

export const Default: Story = {
  args: {
    initialImage: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fbr.ign.com%2Fone-piece-2%2F113295%2Ffeature%2Fluffy-de-one-piece-historia-roupas-recompensas-idade-poderes-e-mais&psig=AOvVaw2jC_p4eThAJV_vFiwPkIev&ust=1711893733491000&source=images&cd=vfe&opi=89978449&ved=0CBIQjRxqFwoTCPjgg6GTnIUDFQAAAAAdAAAAABAF"
  },
};
