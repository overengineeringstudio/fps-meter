import React from 'react'

const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') {
    return 1
  }

  const ratio = window.devicePixelRatio ?? 1
  if (Number.isFinite(ratio)) {
    return Math.round(ratio)
  }

  return 1
}

const supportedFps = [60, 120, 144, 160, 240] as const

const getFrameBarWidth = (fps: number): number => {
  if (fps <= 60) return 2
  if (fps <= 144) return 1
  return 0.5
}

export type FPSMeterProps = {
  width?: number
  height?: number
  initialSystemFps?: number
  className?: string
}

const FRAME_HIT = Symbol('FRAME_HIT')
const FRAME_MISS = Symbol('FRAME_MISS')
const FRAME_UNINITIALIZED = Symbol('FRAME_UNINITIALIZED')

type FrameValue = typeof FRAME_HIT | typeof FRAME_MISS | typeof FRAME_UNINITIALIZED

// TODO handle frames differently if browser went to background
export const FPSMeter: React.FC<FPSMeterProps> = ({ width = 120, height = 30, initialSystemFps = 60, className }) => {
  const [systemFps, setSystemFps] = React.useState<number>(initialSystemFps)

  const frameBarWidth = React.useMemo(() => getFrameBarWidth(systemFps), [systemFps])
  const pixelRatio = React.useMemo(() => getDevicePixelRatio(), [])
  const adjustedWidth = Math.round(width * pixelRatio)
  const adjustedHeight = Math.round(height * pixelRatio)
  const numberOfVisibleFrames = React.useMemo(() => Math.floor(adjustedWidth / frameBarWidth), [adjustedWidth, frameBarWidth])

  // Frame duration tracking for FPS detection
  const last500FrameDurations = React.useMemo(() => Array.from<number>({ length: 500 }).fill(0), [])

  const readjustSystemFps = React.useCallback(() => {
    const nonZero = last500FrameDurations.filter((_) => _ > 0).sort()
    if (nonZero.length < 10) return

    const medianIndex = Math.floor(nonZero.length / 2)
    const tenFramesAroundMedian = nonZero.slice(medianIndex - 5, medianIndex + 5)
    const sumOfTenFramesAroundMedian = tenFramesAroundMedian.reduce((acc, _) => acc + _, 0)
    const newSystemFps = Math.round(10_000 / sumOfTenFramesAroundMedian)

    const closestFps = supportedFps.find((fps) => Math.abs(newSystemFps - fps) < 10)

    if (closestFps === undefined) {
      console.warn(`Unsupported system FPS ${newSystemFps}`)
      return
    }

    if (systemFps !== closestFps) {
      setSystemFps(closestFps)
    }
  }, [last500FrameDurations, systemFps])

  const resolutionInMs = 1000 / systemFps

  // NOTE larger values can result in more items taken from array than it has and makes stuff go boom
  const numberOfSecondsForAverageFps = 2

  // Depending on bar size and screen refresh rate, it can happen that the count of visible frames
  // is smaller than the count of frames used for calculating the average FPS.
  // To avoid this case, we force the number of frames used to calculate average FPS to always be less
  // than the number of visible frames.
  const numberOfFramesForAverageFps = Math.min(numberOfSecondsForAverageFps * systemFps, numberOfVisibleFrames)

  // eslint-disable-next-line unicorn/no-useless-undefined
  const animationFrameRef = React.useRef<number | undefined>(undefined)

  const canvasRef = React.useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (animationFrameRef.current !== undefined && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      if (canvas === null) return
      if (typeof window === 'undefined') return

      if (numberOfFramesForAverageFps > numberOfVisibleFrames) {
        throw new Error(
          `numberOfFramesForAverageFps (${numberOfFramesForAverageFps}) must be smaller than numberOfVisibleFrames (${numberOfVisibleFrames}). Either increase the width or increase the resolutionInMs.`,
        )
      }

      // eslint-disable-next-line unicorn/no-new-array
      const frames: FrameValue[] = new Array(numberOfVisibleFrames).fill(FRAME_UNINITIALIZED)

      const ctx = canvas.getContext('2d')!

      const draw = (frameNumber: number) => {
        ctx.clearRect(0, 0, adjustedWidth, adjustedHeight)

        // Calculate chunk width for alternating pattern
        const chunkWidth = (1 / frameBarWidth) * 8

        for (let i = 0; i < numberOfVisibleFrames; i++) {
          const frameHit = frames[i]!
          if (frameHit === FRAME_UNINITIALIZED) continue

          const x = i * frameBarWidth

          // Alternating colors for visual feedback that rendering isn't blocked
          const isEvenChunk = (frameNumber + i) % (chunkWidth * 2) < chunkWidth
          ctx.fillStyle =
            frameHit === FRAME_MISS
              ? 'rgba(255, 0, 0, 1)' // red
              : isEvenChunk
                ? 'rgba(255, 255, 255, 0.37)' // slightly more transparent
                : 'rgba(255, 255, 255, 0.4)'  // slightly less transparent
          ctx.fillRect(x, adjustedHeight, frameBarWidth, -adjustedHeight)
        }

        // Rendering average FPS value text
        let frameCount = 0
        let numberOfInitializedFrames = 0
        for (let i = 0; i < numberOfFramesForAverageFps; i++) {
          const frameHit = frames.at(-i - 1)!
          if (frameHit !== FRAME_UNINITIALIZED) {
            frameCount += frameHit === FRAME_HIT ? 1 : 0
            numberOfInitializedFrames++
          }
        }
        if (numberOfInitializedFrames >= numberOfFramesForAverageFps) {
          ctx.fillStyle = 'white'
          const fontSize = pixelRatio * 10
          ctx.font = `${fontSize}px monospace`

          const averageFps = Math.round((systemFps * frameCount) / numberOfInitializedFrames)
          ctx.fillText(`${averageFps} FPS`, 2 * pixelRatio, adjustedHeight - 3 * pixelRatio)
        }
      }

      let previousFrameNumber = 0
      let previousFrameTime = 0

      const loop = () => {
        animationFrameRef.current = window.requestAnimationFrame((now) => {
          loop()

          const frameNumber = Math.floor(now / resolutionInMs)

          const numberOfSkippedFrames = frameNumber - previousFrameNumber - 1

          // Checking for skipped frames
          for (let i = 0; i < numberOfSkippedFrames; i++) {
            frames.shift()!
            frames.push(FRAME_MISS)
          }

          frames.shift()!
          frames.push(FRAME_HIT)

          previousFrameNumber = frameNumber

          const frameDuration = now - previousFrameTime
          previousFrameTime = now
          last500FrameDurations.shift()
          last500FrameDurations.push(frameDuration)

          if (frameNumber % 100 === 0) {
            readjustSystemFps()
          }

          draw(frameNumber)
        })
      }

      loop()
    },
    [adjustedHeight, adjustedWidth, numberOfVisibleFrames, numberOfFramesForAverageFps, resolutionInMs, frameBarWidth, last500FrameDurations, readjustSystemFps, pixelRatio],
  )

  return (
    <canvas
      width={adjustedWidth}
      height={adjustedHeight}
      className={className}
      ref={canvasRef}
      style={{ width, height }}
    />
  )
}
