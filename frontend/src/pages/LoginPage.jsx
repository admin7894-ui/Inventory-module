import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Database, Lock, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(form.username, form.password)
      if (res.success) { toast.success('Welcome back!'); navigate('/') }
      else toast.error(res.message || 'Login failed')
    } catch (err) {
      if (err.response?.data?.errors) {
        if (typeof v !== 'undefined' && v.setErrors) v.setErrors(err.response.data.errors)
        else if (typeof setErrors === 'function') setErrors(err.response.data.errors)
        toast.error('Please fix the highlighted errors')
      } else {
        toast.error(err.response?.data?.message || err.message || 'Action failed')
      }
    }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-600 p-4 rounded-2xl mb-4 shadow-lg">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ERP Inventory System</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">46 Tables • Full-Stack ERP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))}
                className="input pl-9" placeholder="Enter username" required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))}
                className="input pl-9 pr-10" placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-base">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Demo Credentials</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { user: 'software_user', pass: 'Pass@1234', role: 'Software Org' },
              { user: 'warehouse_user', pass: 'Pass@1234', role: 'Warehouse' },
              { user: 'medical_user', pass: 'Pass@1234', role: 'Medical' },
            ].map(c => (
              <button key={c.user} type="button" onClick={() => setForm({ username: c.user, password: c.pass })}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:bg-brand-50 transition-colors text-left">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.user}</p>
                  <p className="text-xs text-gray-400">{c.role}</p>
                </div>
                <p className="text-xs text-gray-400 font-mono">{c.pass}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

