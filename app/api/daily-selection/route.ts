import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { PersonWithEntries, PrayerSlot } from '@/lib/types'
import { generatePrayerSlots, generateCatchupIds, prayerEligible, todayStr } from '@/lib/logic'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = todayStr()

    const { data: existing, error: existingErr } = await supabase
        .from('daily_selections')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 })
    if (existing) return NextResponse.json(existing)

    const { data: peopleRaw, error: peopleErr } = await supabase
        .from('people')
        .select('*, entries(*), ticks(*)')
        .eq('user_id', user.id)

    if (peopleErr) return NextResponse.json({ error: peopleErr.message }, { status: 500 })
    const people = (peopleRaw ?? []) as unknown as PersonWithEntries[]

    const { data: previous } = await supabase
        .from('daily_selections')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

    const prevSlots = (previous?.prayer_slots ?? []) as PrayerSlot[]
    const carryover = prevSlots.filter(s => {
        const p = people.find(pp => pp.id === s.person_id)
        return !!p && prayerEligible(p)
    })

    const prayerSlots = generatePrayerSlots(people, carryover, 3)
    const catchupIds = generateCatchupIds(people, 3)

    const { data: inserted, error: insertErr } = await supabase
        .from('daily_selections')
        .insert({ user_id: user.id, date: today, prayer_slots: prayerSlots, catchup_ids: catchupIds })
        .select()
        .single()

    if (insertErr) {
        // Another device raced us and inserted today's row first — just fetch it.
        if (insertErr.code === '23505') {
            const { data: retry, error: retryErr } = await supabase
                .from('daily_selections')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', today)
                .single()
            if (retryErr) return NextResponse.json({ error: retryErr.message }, { status: 500 })
            return NextResponse.json(retry)
        }
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json(inserted)
}