'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'

interface Operation { id: string; title: string; status: string; priority: string; type: string; dueDate: string | null; createdAt: string; mission: { id: string; name: string; codename: string; coverColor: string }; assignee: { name: string } | null; _count: { comments: number } }

const STATUS_OPTS   = ['QUEUED','IN_PROGRESS','REVIEW','COMPLETED','BLOCKED']
const PRIORITY_OPTS = ['LOW','MEDIUM','HIGH','CRITICAL']
const TYPE_OPTS     = ['GENERAL','RESEARCH','ENGINEERING','COMMS','MEDICAL']

const STATUS_BADGE: Record<string,string> = {
  QUEUED:'text-slate-400 bg-slate-500/10 border-slate-500/20',
  IN_PROGRESS:'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  REVIEW:'text-amber-400 bg-amber-500/10 border-amber-500/20',
  COMPLETED:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  BLOCKED:'text-rose-400 bg-rose-500/10 border-rose-500/20',
}
const PRIORITY_COLOR: Record<string,string> = { LOW:'text-emerald-400',MEDIUM:'text-cyan-400',HIGH:'text-amber-400',CRITICAL:'text-rose-400 animate-pulse-glow' }

function Skeleton({ className = '' }) { return <div className={`animate-shimmer rounded-lg ${className}`} /> }

export default function OperationsPage() {
  const { toast } = useToast()
  const [ops, setOps] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [updating, setUpdating] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filterStatus) p.set('status', filterStatus)
    if (filterPriority) p.set('priority', filterPriority)
    if (showOverdueOnly) p.set('overdue', 'true')
    const res = await fetch(`/api/operations?${p}`)
    const data = await res.json()
    setOps(data.operations || [])
    setLoading(false)
  }, [filterStatus, filterPriority, showOverdueOnly])

  useEffect(() => { load() }, [load])

  const updateStatus = async (opId: string, status: string) => {
    setUpdating(opId)
    const res = await fetch(`/api/operations/${opId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) })
    if (res.ok) { toast('Status updated','success'); load() }
    else toast('Failed to update','error')
    setUpdating(null)
  }

  const deleteOp = async (opId: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    const res = await fetch(`/api/operations/${opId}`, { method:'DELETE' })
    if (res.ok) { toast('Deleted','info'); load() }
    else toast('Cannot delete — check permissions','error')
  }

  const overdue = (op: Operation) => op.dueDate && new Date(op.dueDate) < new Date() && op.status !== 'COMPLETED'

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> OPERATIONS</div>
          <h1 className="text-2xl font-bold text-white">Operations Board</h1>
          <p className="text-sm text-slate-400 mt-1">{ops.length} operations across all missions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 bg-[#0f1117] border border-white/[0.06] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer">
          <option value="">All Statuses</option>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 bg-[#0f1117] border border-white/[0.06] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer">
          <option value="">All Priorities</option>
          {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => setShowOverdueOnly(p => !p)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${showOverdueOnly ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#0f1117] border-white/[0.06] text-slate-400 hover:text-white'}`}>
          ⚠ Overdue only
        </button>
        {(filterStatus || filterPriority || showOverdueOnly) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority(''); setShowOverdueOnly(false) }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-white border border-white/[0.06] rounded-lg">Clear ✕</button>
        )}
      </div>

      {/* Table */}
      {loading
        ? <div className="space-y-2">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-16" />)}</div>
        : ops.length === 0
          ? <div className="flex flex-col items-center py-24 text-center">
              <div className="text-6xl mb-4 opacity-20">⚙</div>
              <div className="text-slate-400">No operations found</div>
              <div className="text-sm text-slate-600 mt-1">Operations are created inside missions</div>
            </div>
          : <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                <div className="col-span-4">Operation</div>
                <div className="col-span-2">Mission</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Due</div>
                <div className="col-span-1">Actions</div>
              </div>
              {ops.map(op => (
                <div key={op.id}
                  className={`grid grid-cols-12 gap-4 items-center px-4 py-3.5 bg-[#0f1117] border rounded-xl transition-all hover:border-indigo-500/20
                    ${overdue(op) ? 'border-rose-500/20 bg-rose-500/[0.02]' : 'border-white/[0.05]'}`}>
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      {overdue(op) && <span title="Overdue" className="text-rose-400 text-xs">⚠</span>}
                      <div>
                        <div className="text-sm font-medium text-white truncate">{op.title}</div>
                        {op.assignee && <div className="text-[11px] text-slate-500">→ {op.assignee.name}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Link href={`/missions/${op.mission.id}`} className="flex items-center gap-1.5 group">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: op.mission.coverColor}} />
                      <span className="text-xs text-slate-400 group-hover:text-indigo-300 truncate transition-colors">{op.mission.codename}</span>
                    </Link>
                  </div>
                  <div className="col-span-2">
                    <select value={op.status} onChange={e => updateStatus(op.id, e.target.value)}
                      disabled={updating === op.id}
                      className={`w-full px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer focus:outline-none border transition-all ${STATUS_BADGE[op.status]} bg-transparent`}>
                      {STATUS_OPTS.map(s => <option key={s} value={s} className="bg-[#0f1117] text-white">{s.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <span className={`text-xs font-semibold ${PRIORITY_COLOR[op.priority]}`}>{op.priority}</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-[11px] text-slate-500">{op.type}</span>
                  </div>
                  <div className="col-span-1">
                    {op.dueDate
                      ? <span className={`text-[11px] ${overdue(op) ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>
                          {new Date(op.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                        </span>
                      : <span className="text-[11px] text-slate-700">—</span>}
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => deleteOp(op.id, op.title)} className="text-[11px] text-slate-600 hover:text-rose-400 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  )
}
