'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Modal from '@/components/Modal'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'

interface Member { id: string; role: string; user: { id: string; name: string; email: string } }
interface Operation { id: string; title: string; status: string; priority: string; type: string; dueDate: string | null; assignee: { name: string } | null; _count: { comments: number } }
interface ActivityLog { id: string; action: string; details: string; createdAt: string; user: { name: string } }
interface Mission { id: string; name: string; codename: string; description: string | null; status: string; priority: string; coverColor: string; launchDate: string | null; endDate: string | null; owner: { id: string; name: string }; members: Member[]; operations: Operation[]; activityLogs: ActivityLog[] }

const STATUS_OPTS = ['PLANNING','ACTIVE','ON_HOLD','COMPLETED','ABORTED']
const PRIORITY_OPTS = ['LOW','MEDIUM','HIGH','CRITICAL']
const OP_STATUS_OPTS = ['QUEUED','IN_PROGRESS','REVIEW','COMPLETED','BLOCKED']
const OP_TYPE_OPTS   = ['GENERAL','RESEARCH','ENGINEERING','COMMS','MEDICAL']
const ROLE_OPTS = ['DIRECTOR','OPERATOR','OBSERVER']

const STATUS_BADGE: Record<string,string> = {
  PLANNING:'text-slate-400 bg-slate-500/10 border-slate-500/20',
  ACTIVE:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ON_HOLD:'text-amber-400 bg-amber-500/10 border-amber-500/20',
  COMPLETED:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  ABORTED:'text-rose-400 bg-rose-500/10 border-rose-500/20',
  QUEUED:'text-slate-400 bg-slate-500/10 border-slate-500/20',
  IN_PROGRESS:'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  REVIEW:'text-amber-400 bg-amber-500/10 border-amber-500/20',
  BLOCKED:'text-rose-400 bg-rose-500/10 border-rose-500/20',
}
const PRIORITY_COLOR: Record<string,string> = { LOW:'text-emerald-400', MEDIUM:'text-cyan-400', HIGH:'text-amber-400', CRITICAL:'text-rose-400' }

function Skeleton({ className = '' }) { return <div className={`animate-shimmer rounded-lg ${className}`} /> }

const OP_INIT = { title:'', description:'', status:'QUEUED', priority:'MEDIUM', type:'GENERAL', dueDate:'', assigneeId:'' }

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [mission, setMission] = useState<Mission | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ops'|'members'|'activity'>('ops')
  const [showOpModal, setShowOpModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [opForm, setOpForm] = useState(OP_INIT)
  const [memberEmail, setMemberEmail] = useState(''); const [memberRole, setMemberRole] = useState('OPERATOR')
  const [opErrors, setOpErrors] = useState<Record<string,string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [deletingMember, setDeletingMember] = useState<string|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/missions/${id}`)
    if (res.status === 404) { router.push('/missions'); return }
    const data = await res.json()
    setMission(data.mission); setUserRole(data.userRole)
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const canEdit = userRole === 'DIRECTOR' || userRole === 'OPERATOR'
  const isDirector = userRole === 'DIRECTOR'

  const handleUpdateStatus = async (status: string) => {
    if (!canEdit) return
    await fetch(`/api/missions/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) })
    toast('Status updated', 'success'); load()
  }

  const handleCreateOp = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string,string> = {}
    if (!opForm.title || opForm.title.length < 2) errs.title = 'Title required'
    if (Object.keys(errs).length) { setOpErrors(errs); return }
    setSubmitting(true)
    const res = await fetch('/api/operations', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...opForm, missionId: id, dueDate: opForm.dueDate || null, assigneeId: opForm.assigneeId || null }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { toast(data.error || 'Failed', 'error'); return }
    toast('Operation created!', 'success'); setShowOpModal(false); setOpForm(OP_INIT); load()
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberEmail) return
    setSubmitting(true)
    const res = await fetch(`/api/missions/${id}/members`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: memberEmail, role: memberRole }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { toast(data.error || 'Failed', 'error'); return }
    toast('Member added!', 'success'); setShowMemberModal(false); setMemberEmail(''); load()
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return
    setDeletingMember(userId)
    await fetch(`/api/missions/${id}/members?userId=${userId}`, { method:'DELETE' })
    setDeletingMember(null); toast('Member removed', 'info'); load()
  }

  const handleDeleteMission = async () => {
    if (!confirm(`Delete mission "${mission?.name}"? This is permanent.`)) return
    await fetch(`/api/missions/${id}`, { method:'DELETE' })
    toast('Mission deleted', 'info'); router.push('/missions')
  }

  if (loading) return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-3 gap-4 mt-6">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-24" />)}</div>
    </div>
  )
  if (!mission) return null

  return (
    <div className="h-screen overflow-y-auto">
      {/* Top color bar */}
      <div className="h-1" style={{background: mission.coverColor}} />

      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <button onClick={() => router.push('/missions')} className="text-xs text-slate-500 hover:text-slate-300 mb-3 flex items-center gap-1">← Back to Missions</button>
            <h1 className="text-2xl font-bold text-white">{mission.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-mono text-slate-500">{mission.codename}</span>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[mission.status]}`}>{mission.status.replace('_',' ')}</span>
              <span className={`text-xs font-semibold ${PRIORITY_COLOR[mission.priority]}`}>{mission.priority}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <select value={mission.status} onChange={e => handleUpdateStatus(e.target.value)}
                className="px-3 py-2 bg-[#0f1117] border border-white/[0.06] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer">
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
            {canEdit && <button onClick={() => setShowOpModal(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-all">+ Operation</button>}
            {isDirector && <button onClick={() => setShowMemberModal(true)}
              className="px-4 py-2 bg-[#0f1117] border border-white/[0.06] hover:border-indigo-500/30 text-slate-300 text-sm rounded-xl transition-all">+ Member</button>}
            {isDirector && <button onClick={handleDeleteMission}
              className="px-4 py-2 text-rose-400 hover:bg-rose-500/10 text-sm rounded-xl transition-all border border-transparent hover:border-rose-500/20">Delete</button>}
          </div>
        </div>

        {mission.description && <p className="text-sm text-slate-400 mb-6 max-w-2xl">{mission.description}</p>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.05]">
          {(['ops','members','activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${tab===t ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {t === 'ops' ? `Operations (${mission.operations.length})` : t === 'members' ? `Crew (${mission.members.length})` : 'Activity'}
            </button>
          ))}
        </div>

        {/* Operations Tab */}
        {tab === 'ops' && (
          mission.operations.length === 0
            ? <div className="text-center py-16 text-slate-600"><div className="text-5xl mb-3 opacity-20">⚙</div>No operations yet</div>
            : <div className="space-y-2">
                {mission.operations.map(op => (
                  <div key={op.id} className="flex items-center gap-4 p-4 bg-[#0f1117] border border-white/[0.05] rounded-xl hover:border-indigo-500/20 transition-all">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_BADGE[op.status]?.includes('bg') ? '' : 'bg-slate-500'}`}
                      style={{background: op.status==='COMPLETED'?'#22d3ee':op.status==='IN_PROGRESS'?'#6366f1':op.status==='BLOCKED'?'#f43f5e':op.status==='REVIEW'?'#f59e0b':'#475569'}} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{op.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${STATUS_BADGE[op.status]}`}>{op.status.replace('_',' ')}</span>
                        <span className="text-[10px] text-slate-500">{op.type}</span>
                        {op.assignee && <span className="text-[10px] text-slate-500">→ {op.assignee.name}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-semibold ${PRIORITY_COLOR[op.priority]}`}>{op.priority}</span>
                      {op.dueDate && <div className={`text-[10px] mt-0.5 ${new Date(op.dueDate)<new Date() && op.status !== 'COMPLETED' ? 'text-rose-400' : 'text-slate-500'}`}>
                        {new Date(op.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      </div>}
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div className="space-y-2">
            {mission.members.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-[#0f1117] border border-white/[0.05] rounded-xl">
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">{m.user.name[0]}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{m.user.name}</div>
                  <div className="text-xs text-slate-500">{m.user.email}</div>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${m.role==='DIRECTOR'?'text-indigo-300 bg-indigo-500/10 border-indigo-500/20':m.role==='OBSERVER'?'text-slate-400 bg-slate-500/10 border-slate-500/20':'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>{m.role}</span>
                {isDirector && m.user.id !== mission.owner.id && (
                  <button onClick={() => handleRemoveMember(m.user.id)} disabled={deletingMember===m.user.id}
                    className="text-xs text-rose-400/50 hover:text-rose-400 transition-colors disabled:opacity-30">✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-1">
            {mission.activityLogs.length === 0
              ? <div className="text-center py-12 text-slate-600">No activity recorded</div>
              : mission.activityLogs.map(a => (
                  <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 flex-shrink-0">{a.user.name[0]}</div>
                    <div>
                      <div className="text-sm text-slate-300">{a.details}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{a.user.name} · {new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Create Operation Modal */}
      {showOpModal && (
        <Modal title="New Operation" onClose={() => { setShowOpModal(false); setOpForm(OP_INIT); setOpErrors({}) }}>
          <form onSubmit={handleCreateOp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
              <input value={opForm.title} onChange={e => { setOpForm(p=>({...p,title:e.target.value})); setOpErrors(p=>({...p,title:''})) }}
                className={`w-full px-3.5 py-2.5 bg-[#090b12] border rounded-lg text-sm text-white focus:outline-none focus:ring-2 transition-all ${opErrors.title ? 'border-rose-500 focus:ring-rose-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
                placeholder="Operation title" />
              {opErrors.title && <p className="mt-1 text-xs text-rose-400">{opErrors.title}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
              <textarea value={opForm.description} onChange={e => setOpForm(p=>({...p,description:e.target.value}))} rows={2}
                className="w-full px-3.5 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['status','Status',OP_STATUS_OPTS],['priority','Priority',PRIORITY_OPTS],['type','Type',OP_TYPE_OPTS]].map(([k,l,opts]) => (
                <div key={k as string}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{l as string}</label>
                  <select value={(opForm as any)[k as string]} onChange={e => setOpForm(p=>({...p,[k as string]:e.target.value}))}
                    className="w-full px-3 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none cursor-pointer">
                    {(opts as string[]).map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Due Date</label>
                <input type="date" value={opForm.dueDate} onChange={e => setOpForm(p=>({...p,dueDate:e.target.value}))}
                  className="w-full px-3 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Assign To (User ID or leave blank)</label>
              <select value={opForm.assigneeId} onChange={e => setOpForm(p=>({...p,assigneeId:e.target.value}))}
                className="w-full px-3 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none cursor-pointer">
                <option value="">Unassigned</option>
                {mission?.members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.role})</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowOpModal(false)} className="flex-1 py-2.5 border border-white/10 text-slate-400 rounded-xl text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
                {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Create Operation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <Modal title="Add Crew Member" onClose={() => { setShowMemberModal(false); setMemberEmail('') }}>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Member Email</label>
              <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="operator@axiom.io"
                className="w-full px-3.5 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
              <select value={memberRole} onChange={e => setMemberRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#090b12] border border-white/10 rounded-lg text-sm text-white focus:outline-none cursor-pointer">
                {ROLE_OPTS.map(r => <option key={r}>{r}</option>)}
              </select>
              <p className="mt-1.5 text-[10px] text-slate-600">DIRECTOR: full access · OPERATOR: create/edit ops · OBSERVER: read-only</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowMemberModal(false)} className="flex-1 py-2.5 border border-white/10 text-slate-400 rounded-xl text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2">
                {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null} Add Member
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
