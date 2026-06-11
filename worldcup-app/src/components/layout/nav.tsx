'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ListOrdered, Users, GitBranch, Star, FlaskConical, Settings } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/matches', label: 'Matches', icon: ListOrdered },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/bracket', label: 'Bracket', icon: GitBranch },
  { href: '/bonus', label: 'Bonus', icon: Star },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
            pathname === href
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  )
}
