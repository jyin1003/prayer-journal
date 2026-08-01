import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // matches your confirmation-disabled setup
    })

    if (error) {
        const alreadyExists = error.status === 422 || error.message.toLowerCase().includes('already')
        return NextResponse.json(
            { error: alreadyExists ? 'An account with this email already exists.' : error.message },
            { status: alreadyExists ? 409 : 500 }
        )
    }

    return NextResponse.json({ ok: true })
}