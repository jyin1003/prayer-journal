export type Status = 'frequent' | 'longterm' | 'archived'

export interface Person {
    id: string
    name: string
    status: Status
    created_at: string
}

export interface Entry {
    id: string
    person_id: string
    date: string
    points: string[]
    created_at: string
}

export interface Tick {
    id: string
    person_id: string
    entry_date: string
    point_index: number
    created_at: string
}

export interface PersonWithEntries extends Person {
    entries: Entry[]
    ticks: Tick[]
}

export interface PrayerSlot {
    person_id: string
    is_random: boolean
}

export interface DailySelection {
    id: string
    user_id: string
    date: string
    prayer_slots: PrayerSlot[]
    catchup_ids: string[]
    created_at: string
}