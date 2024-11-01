# fps-meter [![](https://badgen.net/npm/v/@overengineering/fps-meter)](https://www.npmjs.com/package/@overengineering/fps-meter)

Fast and simple FPS meter for React. Renders to a canvas element and uses requestAnimationFrame to update the FPS counter.

<img src='https://share.cleanshot.com/y7S2FbpP/download' style='width: 120px'>

<br />

### Install

```sh
pnpm add @overengineering/fps-meter
```

### Usage

```tsx
import React from 'react'
import { FPSMeter } from '@overengineering/fps-meter'

export const MyApp: React.FC = () => {
  return (
    <div>
      <FPSMeter className="absolute right-0 top-0" height={40} />
    </div>
  )
}
```
