import { MatchList } from './match-list'

interface Props {
  focusFixtureId?: string
}

export function MatchesCombined({ focusFixtureId }: Props) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Matches & Results</h1>
      <MatchList focusFixtureId={focusFixtureId} />
    </div>
  )
}
