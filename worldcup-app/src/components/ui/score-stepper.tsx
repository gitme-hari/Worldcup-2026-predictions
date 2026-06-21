'use client'

interface ScoreStepperProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

export function ScoreStepper({ label, value, onChange, min = 0, max = 15 }: ScoreStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  return (
    <div className="flex-1">
      <p className="text-xs text-zinc-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-0 rounded-lg border border-zinc-300 overflow-hidden">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex items-center justify-center w-11 h-12 text-xl font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed select-none transition-colors touch-manipulation"
        >
          −
        </button>
        <div
          aria-live="polite"
          aria-label={`${label}: ${value}`}
          className="flex-1 text-center text-2xl font-black text-zinc-900 tabular-nums select-none py-2"
        >
          {value}
        </div>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex items-center justify-center w-11 h-12 text-xl font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed select-none transition-colors touch-manipulation"
        >
          +
        </button>
      </div>
    </div>
  )
}
