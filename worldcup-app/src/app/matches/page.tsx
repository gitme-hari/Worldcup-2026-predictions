import { MatchesCombined } from '@/components/matches/matches-combined'

interface Props {
  searchParams: Promise<{ fixture?: string; expand?: string }>
}

export default async function MatchesPage({ searchParams }: Props) {
  const params = await searchParams
  return <MatchesCombined focusFixtureId={params.fixture} />
}
