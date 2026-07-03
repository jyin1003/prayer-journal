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
    const [magicSent, setMagicSent] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function handleSubmit() {
        setError('')
        setLoading(true)
        if (mode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) setError(error.message)
            else router.push('/')
        } else {
            const { error } = await supabase.auth.signUp({ email, password })
            if (error) setError(error.message)
            else router.push('/')
        }
        setLoading(false)
    }

    async function handleMagicLink() {
        if (!email) { setError('Enter your email first'); return }
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) setError(error.message)
        else setMagicSent(true)
        setLoading(false)
    }

    if (magicSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm text-center">
                    <div className="text-3xl mb-4">✉️</div>
                    <h1 className="text-lg font-medium mb-2">Check your email</h1>
                    <p className="text-sm text-gray-500">We sent a magic link to <strong>{email}</strong>. Click it to sign in.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm">
                <h1 className="text-xl font-medium mb-1">Prayer tracker</h1>
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

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">or</span></div>
                </div>

                <button
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="w-full border border-gray-200 hover:bg-gray-50 rounded-lg py-2.5 text-sm text-gray-600 disabled:opacity-50"
                >
                    Send magic link
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