import { GroupStandings } from '@/components/groups/group-standings'

export default function GroupsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-zinc-900">Group Standings</h1>
      <GroupStandings />
    </div>
  )
}
