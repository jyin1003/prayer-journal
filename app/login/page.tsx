'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function handleSubmit() {
        setError('')

        const trimmedEmail = email.trim()
        if (!trimmedEmail || !password) {
            setError('Enter an email and password')
            return
        }
        if (mode === 'signup' && password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        if (mode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
            if (error) setError(error.message)
            else window.location.href = '/'
        } else {
            const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password })
            if (error) {
                setError(error.message)
            } else if (data.session) {
                window.location.href = '/'
            } else if (data.user && data.user.identities?.length === 0) {
                // Supabase's signal for "this email is already registered"
                // when enumeration protection is on — no error is thrown
                setError('An account with this email already exists. Try signing in instead.')
            } else {
                setError('Check your email to confirm your account before signing in.')
            }
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm">
                <h1 className="text-xl font-medium mb-1">Pocket Prayer</h1>
                <p className="text-sm text-gray-500 mb-6">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</p>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            placeholder="you@example.com"
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            placeholder="••••••••"
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                >
                    {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button className="text-blue-500" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    )
}