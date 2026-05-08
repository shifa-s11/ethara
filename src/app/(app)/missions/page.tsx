'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Modal from '@/components/Modal'
import { useToast } from '@/contexts/ToastContext'

interface Mission {
  id: string; name: string; codename: string; description: string | null
  status: string; priority: string; coverColor: string
  launchDate: string | null; endDate: string | null; createdAt: string
  owner: { id: string; name: string; email: string }
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[]
  _count: { operations: number }
}

const STATUS_OPTS  = ['PLANNING','ACTIVE','ON_HOLD','COMPLETED','ABORTED']
const PRIORITY_OPTS = ['LOW','MEDIUM','HIGH','CRITICAL']
const COLORS = ['#6366f1','#22d3ee','#34d399','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#10b981']

const STATUS_BADGE: Record<string, string> = {
  PLANNING: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  ACTIVE:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ON_HOLD:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  COMPLETED:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  ABORTED:  'text-rose-400 bg-rose-500/10 border-rose-500/20',
}
const PRIORITY_BADGE: Record<string, string> = {
  LOW:'text-emerald-400',MEDIUM:'text-cyan-400',HIGH:'text-amber-400',CRITICAL:'text-rose-400',
}

function Skeleton({ className = '' }) {
  return <div className={`animate-shimmer rounded-xl ${className}`} />
}

const INIT = { name:'', codename:'', description:'', status:'PLANNING', priority:'MEDIUM', launchDate:'', endDate:'', coverColor:'#6366f1' }

export default function MissionsPage() {
  const { toast } = useToast()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(INIT)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const loadMissions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterPriority) params.set('priority', filterPriority)
    const res = await fetch(`/api/missions?${params}`)
    const data = await res.json()
    setMissions(data.missions || [])
    setLoading(false)
  }, [filterStatus, filterPriority])

  useEffect(() => { loadMissions() }, [loadMissions])

  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.name || form.name.length < 2) e.name = 'Name required (min 2 chars)'
    if (!form.codename || form.codename.length < 2) e.codename = 'Codename required'
    else if (!/^[A-Z0-9_-]+$/.test(form.codename)) e.codename = 'Uppercase letters, numbers, hyphens only'
    return e
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(); if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    const res = await fetch('/api/missions', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, launchDate: form.launchDate || null, endDate: form.endDate || null }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { toast(data.error || 'Failed to create', 'error'); return }
    toast('Mission created!', 'success')
    setShowCreate(false); setForm(INIT); loadMissions()
  }

  const inp = (key: keyof typeof form, label: string, opts?: { type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type={opts?.type || 'text'} placeholder={opts?.placeholder}
        value={form[key]} onChange={e => { setForm(p=>({...p,[key]:e.target.value})); setErrors(p=>({...p,[key]:''})) }}
        className={`w-full px-3.5 py-2.5 bg-[#090b12] border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${errors[key] ? 'border-rose-500 focus:ring-rose-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
      />
      {errors[key] && <p className="mt-1 text-xs text-rose-400">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> MISSIONS
          </div>
          <h1 className="text-2xl font-bold text-white">Mission Registry</h1>
          <p className="text-sm text-slate-400 mt-1">{missions.length} missions enrolled</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25">
          + New Mission
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
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
        {(filterStatus || filterPriority) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority('') }}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-white/[0.06] rounded-lg hover:border-white/20 transition-colors">
            Clear filters ✕
          </button>
        )}
      </div>

      {/* Grid */}
      {loading
        ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-48" />)}
          </div>
        : missions.length === 0
          ? <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-6xl mb-4 opacity-20">🛸</div>
              <div className="text-slate-400 font-medium">No missions found</div>
              <div className="text-sm text-slate-600 mt-1">Create your first mission to get started</div>
            </div>
          : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {missions.map(m => (
                <Link key={m.id} href={`/missions/${m.id}`}
                  className="bg-[#0f1117] border border-white/[0.06] rounded-xl overflow-hidden hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
                  {/* Color bar */}
                  <div className="h-1.5" style={{background: m.coverColor}} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{m.name}</div>
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{m.codename}</div>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[m.status]}`}>{m.status.replace('_',' ')}</span>
                    </div>
                    {m.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{m.description}</p>}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className={`font-semibold ${PRIORITY_BADGE[m.priority]}`}>{m.priority}</span>
                      <span>{m._count.operations} ops</span>
                      <div className="flex -space-x-1.5">
                        {m.members.slice(0,3).map(mem => (
                          <div key={mem.id} title={mem.user.name}
                            className="w-5 h-5 rounded-full bg-indigo-500/20 border border-[#0f1117] flex items-center justify-center text-[9px] font-bold text-indigo-400">
                            {mem.user.name[0]}
                          </div>
                        ))}
                        {m.members.length > 3 && <div className="w-5 h-5 rounded-full bg-slate-700 border border-[#0f1117] flex items-center justify-center text-[9px] text-slate-400">+{m.members.length-3}</div>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
      }

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Launch New Mission" onClose={() => { setShowCreate(false); setForm(INIT); setErrors({}) }}>
          <form onSubmit={handleCreate} className="space-y-4">
            {inp('name','Mission Name',{placeholder:'Deep Space Relay'})}
            {inp('codename','Codename',{placeholder:'DSR-ALPHA (UPPERCASE only)'})}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={3}
                className="w-full px-3.5 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 resize-none" placeholder="Mission briefing..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value}))}
                  className="w-full px-3 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Priority</label>
                <select value={form.priority} onChange={e => setForm(p=>({...p,priority:e.target.value}))}
                  className="w-full px-3 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer">
                  {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {inp('launchDate','Launch Date',{type:'date'})}
              {inp('endDate','End Date',{type:'date'})}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cover Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(p=>({...p,coverColor:c}))}
                    className={`w-7 h-7 rounded-full transition-all ${form.coverColor===c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#090b12]' : 'opacity-70 hover:opacity-100'}`}
                    style={{background:c}} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); setForm(INIT) }}
                className="flex-1 py-2.5 border border-white/10 text-slate-400 hover:text-white rounded-xl text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Launch Mission'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
