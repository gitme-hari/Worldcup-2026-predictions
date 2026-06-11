import { MatchDetail } from '@/components/matches/match-detail'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Match Detail</h1>
      <MatchDetail fixtureId={decodeURIComponent(id)} />
    </div>
  )
}
