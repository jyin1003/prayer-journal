import { PersonWithEntries, Entry, Tick } from './types'

export function getLatestEntry(person: PersonWithEntries): Entry | null {
    if (!person.entries?.length) return null
    return [...person.entries].sort((a, b) => b.date.localeCompare(a.date))[0]
}

export function isPointTicked(ticks: Tick[], personId: string, entryDate: string, pointIdx: number): boolean {
    return ticks.some(
        t => t.person_id === personId && t.entry_date === entryDate && t.point_index === pointIdx
    )
}

export function hasUnticked(person: PersonWithEntries): boolean {
    if (person.status === 'archived') return false
    const entry = getLatestEntry(person)
    if (!entry || !entry.points.length) return false
    return entry.points.some((_, i) => !isPointTicked(person.ticks, person.id, entry.date, i))
}

export function allLatestTicked(person: PersonWithEntries): boolean {
    const entry = getLatestEntry(person)
    if (!entry || !entry.points.length) return false
    return entry.points.every((_, i) => isPointTicked(person.ticks, person.id, entry.date, i))
}

export function weeksAgo(dateStr: string): number {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}

export function getPrayerCandidates(people: PersonWithEntries[]): { person: PersonWithEntries; isRandom: boolean }[] {
    const frequent = people.filter(p => p.status === 'frequent' && hasUnticked(p))
    const longterm = people.filter(p => p.status === 'longterm' && hasUnticked(p))

    const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
    const sFrequent = shuffle(frequent)
    const sLongterm = shuffle(longterm)

    const slots: { person: PersonWithEntries; isRandom: boolean }[] = []
    let fi = 0, li = 0

    while (slots.length < 3 && (fi < sFrequent.length || li < sLongterm.length)) {
        if (fi < sFrequent.length) {
            slots.push({ person: sFrequent[fi++], isRandom: false })
        }
        if (slots.length < 3 && li < sLongterm.length && Math.random() < 0.25) {
            slots.push({ person: sLongterm[li++], isRandom: false })
        } else if (slots.length < 3 && fi >= sFrequent.length && li < sLongterm.length) {
            slots.push({ person: sLongterm[li++], isRandom: false })
        }
    }

    // Fill remaining slots with random people (even ticked ones)
    if (slots.length < 3) {
        const usedIds = new Set(slots.map(s => s.person.id))
        const rest = shuffle(people.filter(p => p.status !== 'archived' && !usedIds.has(p.id) && getLatestEntry(p)))
        for (const p of rest) {
            if (slots.length >= 3) break
            slots.push({ person: p, isRandom: true })
        }
    }

    return slots.slice(0, 3)
}

export function getCatchupPeople(people: PersonWithEntries[]): { person: PersonWithEntries; weeks: number }[] {
    return people
        .filter(p => {
            if (p.status === 'archived') return false
            const entry = getLatestEntry(p)
            if (!entry) return false
            const weeks = weeksAgo(entry.date)
            const threshold = p.status === 'longterm' ? 12 : 3
            return weeks >= threshold && allLatestTicked(p)
        })
        .map(p => ({ person: p, weeks: weeksAgo(getLatestEntry(p)!.date) }))
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