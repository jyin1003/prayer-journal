import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { PersonWithEntries, PrayerSlot } from '@/lib/types'
import { generatePrayerSlots, generateCatchupIds, generateFallbackSlots, prayerEligible, todayStr } from '@/lib/logic'

export async function GET() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = todayStr()

    const { data: peopleRaw, error: peopleErr } = await supabase
        .from('people')
        .select('*, entries(*), ticks(*)')
        .eq('user_id', user.id)

    if (peopleErr) return NextResponse.json({ error: peopleErr.message }, { status: 500 })
    const people = (peopleRaw ?? []) as unknown as PersonWithEntries[]

    const { data: existing, error: existingErr } = await supabase
        .from('daily_selections')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

    if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 })

    let selection = existing

    if (!selection) {
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
            if (insertErr.code === '23505') {
                // Another device raced us and inserted today's row first — just fetch it.
                const { data: retry, error: retryErr } = await supabase
                    .from('daily_selections')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('date', today)
                    .single()
                if (retryErr) return NextResponse.json({ error: retryErr.message }, { status: 500 })
                selection = retry
            } else {
                return NextResponse.json({ error: insertErr.message }, { status: 500 })
            }
        } else {
            selection = inserted
        }
    }

    // If everyone in today's real slots is fully ticked, generate (once) a
    // stable fallback list, preferencing people ticked longest ago.
    const realSlots = (selection!.prayer_slots ?? []) as PrayerSlot[]
    const hasRealCandidates = realSlots.some(s => {
        const p = people.find(pp => pp.id === s.person_id)
        return !!p && prayerEligible(p)
    })

    if (!hasRealCandidates && !selection!.fallback_slots) {
        const excludeIds = new Set(realSlots.map(s => s.person_id))
        const fallbackSlots = generateFallbackSlots(people, excludeIds, 3)

        const { data: updated, error: updateErr } = await supabase
            .from('daily_selections')
            .update({ fallback_slots: fallbackSlots })
            .eq('id', selection!.id)
            .select()
            .single()

        if (!updateErr && updated) selection = updated
    }

    return NextResponse.json(selection)
}