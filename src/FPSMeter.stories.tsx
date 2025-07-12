import type { Meta, StoryObj } from '@storybook/react'
import { FPSMeter } from './index'

const meta: Meta<typeof FPSMeter> = {
  title: 'FPSMeter',
  component: FPSMeter,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    width: {
      control: { type: 'range', min: 50, max: 300, step: 10 },
    },
    height: {
      control: { type: 'range', min: 20, max: 100, step: 5 },
    },
    initialSystemFps: {
      control: { type: 'select' },
      options: [60, 120, 144, 160, 240],
    },
    className: {
      control: { type: 'text' },
    },
  },
}

export default meta
type Story = StoryObj<typeof FPSMeter>

export const Default: Story = {
  args: {
    width: 120,
    height: 30,
    initialSystemFps: 60,
  },
}

export const Small: Story = {
  args: {
    width: 80,
    height: 20,
    initialSystemFps: 60,
  },
}

export const Large: Story = {
  args: {
    width: 200,
    height: 50,
    initialSystemFps: 60,
  },
}

export const HighRefreshRate: Story = {
  args: {
    width: 120,
    height: 30,
    initialSystemFps: 144,
  },
}

export const VeryHighRefreshRate: Story = {
  args: {
    width: 120,
    height: 30,
    initialSystemFps: 240,
  },
}