'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Metrics {
  totalMissions: number; activeMissions: number; totalOperations: number
  completedOperations: number; overdueOperations: number; criticalOperations: number; completionRate: number
}
interface ChartData { status: string; count: number }
interface ActivityItem { id: string; action: string; details: string; createdAt: string; user: { name: string } }
interface AssignedOp { id: string; title: string; status: string; priority: string; dueDate: string | null; mission: { name: string; codename: string; coverColor: string } }

const STATUS_COLORS: Record<string, string> = {
  PLANNING:'bg-slate-500', ACTIVE:'bg-emerald-500', ON_HOLD:'bg-amber-500', COMPLETED:'bg-cyan-500', ABORTED:'bg-rose-500',
  QUEUED:'bg-slate-500', IN_PROGRESS:'bg-indigo-500', REVIEW:'bg-amber-500', BLOCKED:'bg-rose-500',
}
const PRIORITY_BADGE: Record<string, string> = {
  LOW:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  MEDIUM:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  HIGH:'text-amber-400 bg-amber-500/10 border-amber-500/20',
  CRITICAL:'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

function Skeleton({ className = '' }) {
  return <div className={`animate-shimmer rounded-lg ${className}`} />
}

function MetricCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5 hover:border-indigo-500/20 transition-colors">
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function MiniBarChart({ data, label }: { data: ChartData[]; label: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">{label}</div>
      <div className="space-y-2.5">
        {data.map(d => (
          <div key={d.status} className="flex items-center gap-3">
            <div className="w-24 text-[11px] text-slate-400 truncate">{d.status.replace('_', ' ')}</div>
            <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[d.status] || 'bg-slate-500'}`}
                style={{ width: `${(d.count / max) * 100}%` }} />
            </div>
            <div className="text-xs text-slate-500 w-4 text-right">{d.count}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-xs text-slate-600 text-center py-4">No data yet</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [charts, setCharts] = useState<{ missionsByStatus: ChartData[]; operationsByStatus: ChartData[] } | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [myOps, setMyOps] = useState<AssignedOp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      setMetrics(d.metrics); setCharts(d.charts); setActivity(d.recentActivity); setMyOps(d.myAssignedOps)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> COMMAND CENTER
        </div>
        <h1 className="text-2xl font-bold text-white">Mission Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time operations dashboard</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {loading ? Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-24" />) : <>
          <MetricCard label="Missions"  value={metrics!.totalMissions}    sub="total enrolled" />
          <MetricCard label="Active"    value={metrics!.activeMissions}    sub="missions live"   accent="text-emerald-400" />
          <MetricCard label="Operations" value={metrics!.totalOperations}  sub="tasks created" />
          <MetricCard label="Complete"  value={`${metrics!.completionRate}%`} sub="completion rate" accent="text-cyan-400" />
          <MetricCard label="Overdue"   value={metrics!.overdueOperations} sub="past due date"   accent={metrics!.overdueOperations > 0 ? 'text-amber-400' : 'text-white'} />
          <MetricCard label="Critical"  value={metrics!.criticalOperations} sub="need attention" accent={metrics!.criticalOperations > 0 ? 'text-rose-400' : 'text-white'} />
        </>}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {loading ? <><Skeleton className="h-48" /><Skeleton className="h-48" /></> : <>
          <MiniBarChart data={charts!.missionsByStatus}   label="Missions by Status" />
          <MiniBarChart data={charts!.operationsByStatus} label="Operations by Status" />
        </>}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Assigned Ops */}
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">My Operations</div>
            <Link href="/operations" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
          </div>
          {loading ? <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12" />)}</div>
          : myOps.length === 0
            ? <div className="text-center py-8 text-slate-600 text-sm">No operations assigned to you</div>
            : <div className="space-y-2">
                {myOps.map(op => (
                  <Link key={op.id} href={`/operations/${op.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: op.mission.coverColor}} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate group-hover:text-indigo-300 transition-colors">{op.title}</div>
                      <div className="text-[11px] text-slate-500">{op.mission.codename}</div>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[op.priority]}`}>{op.priority}</span>
                    {op.dueDate && <span className={`text-[10px] ${new Date(op.dueDate) < new Date() ? 'text-rose-400' : 'text-slate-500'}`}>
                      {new Date(op.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                    </span>}
                  </Link>
                ))}
              </div>
          }
        </div>

        {/* Activity Feed */}
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-xl p-5">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Recent Activity</div>
          {loading ? <div className="space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-10" />)}</div>
          : activity.length === 0
            ? <div className="text-center py-8 text-slate-600 text-sm">No activity yet</div>
            : <div className="space-y-1 overflow-y-auto max-h-64">
                {activity.map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-white/[0.03] last:border-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 flex-shrink-0 mt-0.5">
                      {a.user.name[0]}
                    </div>
                    <div>
                      <div className="text-xs text-slate-300">{a.details}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {a.user.name} · {new Date(a.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
