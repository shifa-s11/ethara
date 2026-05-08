'use client'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard',  label: 'Command Center', icon: '◈' },
  { href: '/missions',   label: 'Missions',        icon: '🛸' },
  { href: '/operations', label: 'Operations',      icon: '⚙' },
]

function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm'|'md'|'lg' }) {
  const sz = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' }[size]
  return (
    <div className={`${sz} rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const path = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-[#090b12] border-r border-white/[0.05] flex flex-col px-3 py-5 sticky top-0 h-screen overflow-y-auto flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl">⬡</div>
        <div>
          <div className="text-sm font-extrabold tracking-[0.15em] text-white">AXIOM</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest">MISSION CONTROL</div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 mb-5 mx-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] flex-shrink-0" />
        <span className="text-[11px] font-mono text-emerald-400 tracking-wide">Systems Nominal</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map(item => {
          const active = path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group
                ${active
                  ? 'bg-indigo-500/10 text-indigo-300 font-medium'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'}`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
              {active && <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* User */}
      <div className="border-t border-white/[0.05] pt-4 space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={user?.name} />
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-xs text-slate-500 hover:text-rose-400 transition-colors py-1.5 rounded-lg hover:bg-rose-500/5 flex items-center justify-center gap-1.5">
          <span>↪</span> Sign out
        </button>
      </div>
    </aside>
  )
}
