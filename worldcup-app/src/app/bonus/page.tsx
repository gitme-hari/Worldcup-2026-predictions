import { BonusPredictionsPanel } from '@/components/bonus/bonus-predictions'

export default function BonusPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Bonus Predictions</h1>
      <BonusPredictionsPanel />
    </div>
  )
}
