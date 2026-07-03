import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { person_id, points } = await req.json()
    if (!person_id || !points?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: person } = await supabase.from('people').select('id').eq('id', person_id).eq('user_id', user.id).single()
    if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabase
        .from('entries').insert({ person_id, date: new Date().toISOString().slice(0, 10), points }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}