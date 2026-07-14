import { PersonWithEntries, Entry, Tick, Status, PrayerSlot } from './types'

export function getLatestEntry(person: PersonWithEntries): Entry | null {
    if (!person.entries?.length) return null
    return [...person.entries].sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function isPointTicked(ticks: Tick[], personId: string, entryDate: string, pointIdx: number): boolean {
    return ticks.some(
        t => t.person_id === personId && t.entry_date === entryDate && t.point_index === pointIdx
    )
}

// Any entry (not just latest) has an unticked point
export function hasAnyUnticked(person: PersonWithEntries): boolean {
    if (person.status === 'archived') return false
    if (!person.entries?.length) return false
    return person.entries.some(entry =>
        entry.points.some((_, i) => !isPointTicked(person.ticks, person.id, entry.date, i))
    )
}

// Every point across every entry is ticked
export function isFullyTicked(person: PersonWithEntries): boolean {
    if (!person.entries?.length) return false
    return person.entries.every(entry =>
        entry.points.every((_, i) => isPointTicked(person.ticks, person.id, entry.date, i))
    )
}

export function weeksAgo(dateStr: string): number {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}

export function prayerEligible(person: PersonWithEntries): boolean {
    return (person.status === 'frequent' || person.status === 'longterm') && hasAnyUnticked(person)
}

// Most recent tick timestamp for a person. Never-ticked people are treated
// as maximally stale (-Infinity) so they surface first in the fallback list.
export function lastTickTime(person: PersonWithEntries): number {
    if (!person.ticks?.length) return -Infinity
    return Math.max(...person.ticks.map(t => new Date(t.created_at).getTime()))
}

// Eligible for the "everyone's done" fallback list: has prayer points at all,
// regardless of tick status.
export function fallbackEligible(person: PersonWithEntries): boolean {
    return (person.status === 'frequent' || person.status === 'longterm') && !!getLatestEntry(person)
}

export function generateFallbackSlots(
    people: PersonWithEntries[],
    excludeIds: Set<string>,
    target = 3
): PrayerSlot[] {
    const pool = people
        .filter(p => fallbackEligible(p) && !excludeIds.has(p.id))
        .sort((a, b) => lastTickTime(a) - lastTickTime(b)) // oldest tick first
    return pool.slice(0, target).map(p => ({ person_id: p.id, is_random: true }))
}

export function catchupEligible(person: PersonWithEntries): boolean {
    if (person.status === 'archived') return false
    const entry = getLatestEntry(person)
    if (!entry) return false
    const threshold = person.status === 'longterm' ? 12 : 3
    return weeksAgo(entry.date) >= threshold && isFullyTicked(person)
}

const STATUS_PRIORITY: Record<Status, number> = { frequent: 0, longterm: 1, archived: 2 }

// --- Generation (run once per day, server-side) ---

export function generatePrayerSlots(
    people: PersonWithEntries[],
    carryover: PrayerSlot[],
    target = 3
): PrayerSlot[] {
    const slots: PrayerSlot[] = [...carryover]
    const usedIds = new Set(slots.map(s => s.person_id))

    const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)

    const frequentPool = shuffle(people.filter(p => p.status === 'frequent' && prayerEligible(p) && !usedIds.has(p.id)))
    const longtermPool = shuffle(people.filter(p => p.status === 'longterm' && prayerEligible(p) && !usedIds.has(p.id)))

    let fi = 0, li = 0
    while (slots.length < target && (fi < frequentPool.length || li < longtermPool.length)) {
        if (fi < frequentPool.length) {
            const p = frequentPool[fi++]
            slots.push({ person_id: p.id, is_random: false })
            usedIds.add(p.id)
        }
        if (slots.length < target && li < longtermPool.length && Math.random() < 0.25) {
            const p = longtermPool[li++]
            slots.push({ person_id: p.id, is_random: false })
            usedIds.add(p.id)
        } else if (slots.length < target && fi >= frequentPool.length && li < longtermPool.length) {
            const p = longtermPool[li++]
            slots.push({ person_id: p.id, is_random: false })
            usedIds.add(p.id)
        }
    }

    if (slots.length < target) {
        const rest = shuffle(people.filter(p => p.status !== 'archived' && !usedIds.has(p.id) && getLatestEntry(p)))
        for (const p of rest) {
            if (slots.length >= target) break
            slots.push({ person_id: p.id, is_random: true })
            usedIds.add(p.id)
        }
    }

    return slots.slice(0, target)
}

export function generateCatchupIds(people: PersonWithEntries[], target = 3): string[] {
    const eligible = people.filter(catchupEligible)
    eligible.sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status], pb = STATUS_PRIORITY[b.status]
        if (pa !== pb) return pa - pb
        return weeksAgo(getLatestEntry(b)!.date) - weeksAgo(getLatestEntry(a)!.date)
    })
    return eligible.slice(0, target).map(p => p.id)
}

// --- Display (run on every render, filters the frozen daily lists live) ---

export function filterPrayerDisplay(
    people: PersonWithEntries[],
    slots: PrayerSlot[],
    fallbackSlots: PrayerSlot[] | null
): { person: PersonWithEntries; isRandom: boolean }[] {
    const real = slots
        .map(s => {
            const person = people.find(p => p.id === s.person_id)
            if (!person || !prayerEligible(person)) return null
            return { person, isRandom: s.is_random }
        })
        .filter((x): x is { person: PersonWithEntries; isRandom: boolean } => x !== null)

    if (real.length > 0) return real
    if (!fallbackSlots?.length) return []

    return fallbackSlots
        .map(s => {
            const person = people.find(p => p.id === s.person_id)
            if (!person) return null
            return { person, isRandom: true }
        })
        .filter((x): x is { person: PersonWithEntries; isRandom: boolean } => x !== null)
}

export function filterCatchupDisplay(
    people: PersonWithEntries[],
    ids: string[]
): { person: PersonWithEntries; weeks: number }[] {
    return ids
        .map(id => {
            const person = people.find(p => p.id === id)
            if (!person || !catchupEligible(person)) return null
            return { person, weeks: weeksAgo(getLatestEntry(person)!.date) }
        })
        .filter((x): x is { person: PersonWithEntries; weeks: number } => x !== null)
        .sort((a, b) => b.weeks - a.weeks)
}

export function todayStr(): string {
    return new Date().toISOString().slice(0, 10)
}

export function fmtDate(d: string): string {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric'
    })
}

export function initials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
    ['#E6F1FB', '#0C447C'], ['#EEEDFE', '#3C3489'], ['#E1F5EE', '#085041'],
    ['#FAEEDA', '#633806'], ['#FAECE7', '#712B13'], ['#FBEAF0', '#72243E'],
]

export function avatarColor(name: string): [string, string] {
    let h = 0
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
    return AVATAR_COLORS[Math.abs(h)] as [string, string]
}