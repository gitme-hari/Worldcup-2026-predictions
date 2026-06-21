import { BonusPage } from '@/components/bonus/bonus-page'

export default function BonusPageRoute() {
  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-900">Bonus Tracker</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Track your pre-tournament bonus picks through the tournament.
        </p>
      </div>
      <BonusPage />
    </div>
  )
}
