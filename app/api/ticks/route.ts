import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { person_id, entry_date, point_index } = await req.json()
    if (!person_id || !entry_date || point_index === undefined)
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: person } = await supabase.from('people').select('id').eq('id', person_id).eq('user_id', user.id).single()
    if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase.from('ticks').insert({ person_id, entry_date, point_index })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { person_id, entry_date, point_index } = await req.json()
    const { error } = await supabase.from('ticks').delete()
        .eq('person_id', person_id).eq('entry_date', entry_date).eq('point_index', point_index)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}