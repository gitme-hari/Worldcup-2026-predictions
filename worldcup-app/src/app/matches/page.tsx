import { MatchList } from '@/components/matches/match-list'

export default function MatchesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Match Predictions</h1>
      <MatchList />
    </div>
  )
}
