'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const { register, user, loading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => { if (!loading && user) router.push('/dashboard') }, [user, loading, router])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters'
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true); setServerError('')
    const result = await register(form.name, form.email, form.password)
    setSubmitting(false)
    if (result.error) setServerError(result.error)
    else router.push('/dashboard')
  }

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} value={form[key]}
        onChange={e => { setForm(p => ({...p, [key]: e.target.value})); setErrors(p => ({...p, [key]:''})) }}
        className={`w-full px-3.5 py-2.5 bg-[#090b12] border rounded-lg text-white text-sm placeholder-slate-600 transition-all focus:outline-none focus:ring-2 ${errors[key] ? 'border-rose-500 focus:ring-rose-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
      />
      {errors[key] && <p className="mt-1 text-xs text-rose-400">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
      <div className="fixed inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)',backgroundSize:'48px 48px'}} />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="text-3xl">⬡</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AXIOM</h1>
          <p className="text-sm text-slate-400 font-mono mt-1">Mission Control Platform</p>
        </div>

        <div className="bg-[#0f1117] border border-white/[0.06] rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
          <p className="text-sm text-slate-400 mb-6">Join the mission operations team</p>

          {serverError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm flex items-center gap-2">
              <span>⚠</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('name', 'Full name', 'text', 'Jane Doe')}
            {field('email', 'Email address', 'email', 'operator@axiom.io')}
            {field('password', 'Password', 'password', '8+ characters')}
            {field('confirm', 'Confirm password', 'password', 'Repeat password')}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 mt-2">
              {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</> : 'Join Mission Control'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have access?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
