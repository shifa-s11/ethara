'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => { if (!loading && user) router.push('/dashboard') }, [user, loading, router])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true); setServerError('')
    const result = await login(form.email, form.password)
    setSubmitting(false)
    if (result.error) setServerError(result.error)
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)',backgroundSize:'48px 48px'}} />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="text-3xl">⬡</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AXIOM</h1>
          <p className="text-sm text-slate-400 font-mono mt-1">Mission Control Platform</p>
        </div>

        {/* Card */}
        <div className="bg-[#0f1117] border border-white/[0.06] rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-6">Sign in to access the control center</p>

          {serverError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm flex items-center gap-2">
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <input
                type="email" placeholder="operator@axiom.io"
                value={form.email}
                onChange={e => { setForm(p => ({...p, email: e.target.value})); setErrors(p => ({...p, email:''})) }}
                className={`w-full px-3.5 py-2.5 bg-[#090b12] border rounded-lg text-white text-sm placeholder-slate-600 transition-all focus:outline-none focus:ring-2 ${errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password" placeholder="••••••••"
                value={form.password}
                onChange={e => { setForm(p => ({...p, password: e.target.value})); setErrors(p => ({...p, password:''})) }}
                className={`w-full px-3.5 py-2.5 bg-[#090b12] border rounded-lg text-white text-sm placeholder-slate-600 transition-all focus:outline-none focus:ring-2 ${errors.password ? 'border-rose-500 focus:ring-rose-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password}</p>}
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 mt-2">
              {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</> : 'Access Control Center'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          New to Axiom?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Create account</Link>
        </p>
      </div>
    </div>
  )
}
