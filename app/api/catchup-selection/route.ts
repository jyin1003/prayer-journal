import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { PersonWithEntries } from '@/lib/types'
import { backfillCatchupIds } from '@/lib/logic'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: peopleRaw, error: peopleErr } = await supabase
        .from('people')
        .select('*, entries(*), ticks(*)')
        .eq('user_id', user.id)

    if (peopleErr) return NextResponse.json({ error: peopleErr.message }, { status: 500 })
    const people = (peopleRaw ?? []) as unknown as PersonWithEntries[]

    const { data: existing, error: existingErr } = await supabase
        .from('catchup_state')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 })

    const currentIds: string[] = (existing?.person_ids ?? []) as string[]
    const nextIds = backfillCatchupIds(people, currentIds, 3)

    if (!existing) {
        const { data: inserted, error: insertErr } = await supabase
            .from('catchup_state')
            .insert({ user_id: user.id, person_ids: nextIds })
            .select()
            .single()

        if (insertErr) {
            if (insertErr.code === '23505') {
                // Another device raced us — fetch what it wrote instead.
                const { data: retry, error: retryErr } = await supabase
                    .from('catchup_state')
                    .select('*')
                    .eq('user_id', user.id)
                    .single()
                if (retryErr) return NextResponse.json({ error: retryErr.message }, { status: 500 })
                return NextResponse.json(retry.person_ids)
            }
            return NextResponse.json({ error: insertErr.message }, { status: 500 })
        }
        return NextResponse.json(inserted.person_ids)
    }

    const changed = nextIds.length !== currentIds.length || nextIds.some((id, i) => id !== currentIds[i])
    if (!changed) return NextResponse.json(currentIds)

    const { data: updated, error: updateErr } = await supabase
        .from('catchup_state')
        .update({ person_ids: nextIds, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json(updated.person_ids)
}