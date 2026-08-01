'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PersonWithEntries, Status, DailySelection } from '@/lib/types'
import { filterPrayerDisplay, filterCatchupDisplay } from '@/lib/logic'
import PersonCard from '@/components/PersonCard'
import Modal, { ModalState } from '@/components/Modal'
import HistoryModal from '@/components/HistoryModal'

export default function Dashboard() {
    const [people, setPeople] = useState<PersonWithEntries[]>([])
    const [dailySelection, setDailySelection] = useState<DailySelection | null>(null)
    const [tab, setTab] = useState<'prayers' | 'people'>('prayers')
    const [modal, setModal] = useState<ModalState | null>(null)
    const [historyPersonId, setHistoryPersonId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [catchupIds, setCatchupIds] = useState<string[] | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        const stored = localStorage.getItem('pocket-prayer-theme') as 'light' | 'dark' | null
        const initial = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        setTheme(initial)
        document.documentElement.classList.toggle('dark', initial === 'dark')
    }, [])

    function toggleTheme() {
        const next = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        localStorage.setItem('pocket-prayer-theme', next)
        document.documentElement.classList.toggle('dark', next === 'dark')
    }

    async function load() {
        const res = await fetch('/api/people')
        if (res.ok) setPeople(await res.json())
        setLoading(false)
    }

    async function loadDailySelection() {
        const res = await fetch('/api/daily-selection')
        if (res.ok) setDailySelection(await res.json())
    }

    async function loadCatchupSelection() {
        const res = await fetch('/api/catchup-selection')
        if (res.ok) setCatchupIds(await res.json())
    }

    useEffect(() => { load(); loadDailySelection(); loadCatchupSelection() }, [])

    async function handleTick(personId: string, entryDate: string, pointIdx: number, ticked: boolean) {
        // Optimistic update — flip the UI instantly, don't wait on the network
        setPeople(prev => prev.map(p => {
            if (p.id !== personId) return p
            if (ticked) {
                return {
                    ...p,
                    ticks: p.ticks.filter(t => !(t.person_id === personId && t.entry_date === entryDate && t.point_index === pointIdx))
                }
            }
            return {
                ...p,
                ticks: [...p.ticks, {
                    id: `temp-${personId}-${entryDate}-${pointIdx}`,
                    person_id: personId,
                    entry_date: entryDate,
                    point_index: pointIdx,
                    created_at: new Date().toISOString(),
                }]
            }
        }))

        try {
            const res = await fetch('/api/ticks', {
                method: ticked ? 'DELETE' : 'POST',
                body: JSON.stringify({ person_id: personId, entry_date: entryDate, point_index: pointIdx })
            })
            if (!res.ok) throw new Error('Tick request failed')
        } catch (err) {
            console.error(err)
            // Something went wrong server-side — pull the real state back down
            load()
        }
    }
    async function handleAddPerson(name: string, status: Status, points: string[]) {
        await fetch('/api/people', { method: 'POST', body: JSON.stringify({ name, status, points }) })
        load()
    }
    async function handleAddPoints(personId: string, points: string[]) {
        await fetch('/api/entries', { method: 'POST', body: JSON.stringify({ person_id: personId, points }) })
        await load()
        loadCatchupSelection()
    }
    async function handleEditPerson(personId: string, name: string, status: Status) {
        await fetch('/api/people', { method: 'PATCH', body: JSON.stringify({ id: personId, name, status }) })
        load()
    }
    async function handleDeletePerson(personId: string) {
        await fetch('/api/people', { method: 'DELETE', body: JSON.stringify({ id: personId }) })
        load()
    }
    async function handleSignOut() {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (loading || !dailySelection || catchupIds === null) return (
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-400 dark:bg-gray-900 dark:text-gray-500">
            Loading…
        </div>
    )
    const candidates = filterPrayerDisplay(people, dailySelection.prayer_slots, dailySelection.fallback_slots)
    const catchup = filterCatchupDisplay(people, catchupIds)    const findPerson = (id: string) => people.find(p => p.id === id)!
    const filteredPeople = people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    const historyPerson = historyPersonId ? findPerson(historyPersonId) : null

    return (
        <div className="max-w-lg mx-auto p-4">
            <div className="flex flex-col items-center mb-4">
                <img
                    src={theme === 'dark' ? '/logo_light-512.png' : '/logo_light-512.png'}
                    alt="Pocket Prayer"
                    className="h-20 w-20 mb-1"
                />
                <button
                    onClick={toggleTheme}
                    aria-label="Toggle dark mode"
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors mb-1"
                >
                    {theme === 'dark' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    )}
                </button>
                <button onClick={handleSignOut} className="text-xs text-gray-400">Sign out</button>
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setTab('prayers')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'prayers' ? 'bg-highlight text-gray-800' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-200'}`}
                >
                    Prayers
                </button>

                <button
                    onClick={() => setTab('people')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'people' ? 'bg-highlight text-gray-800' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-200'}`}
                >
                    People
                </button>
            </div>

            {tab === 'prayers' && (
                <>
                    <h2 className="text-s font-medium text-gray-700 dark:text-gray-400 mt-6 mb-2">People to pray for</h2>
                    {candidates.length > 0 ? (
                        candidates.map(({ person, isRandom }) => (
                            <PersonCard key={person.id} person={person} isRandom={isRandom} onTick={handleTick}
                                onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500">Finished for today :)</p>
                    )}

                    <h2 className="text-s font-medium text-gray-700 dark:text-gray-400 mt-6 mb-2">People to catch up with</h2>
                    {catchup.length > 0 ? (
                        // Catchup cards — compact, no checklist, click opens history:
                        catchup.map(({ person }) => (
                            <PersonCard key={person.id} person={person} variant="compact"
                                onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                                onCardClick={setHistoryPersonId} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500">None so far :))</p>
                    )}
                </>
            )}

            {tab === 'people' && (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search people…"
                            className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <button
                            onClick={() => setModal({ type: 'addPerson' })}
                            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-highlight hover:bg-dark-highlight text-black"
                            aria-label="Add person"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                    </div>

                    {filteredPeople.map(person => (
                        <PersonCard key={person.id} person={person} variant="compact"
                            onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                            onEdit={id => setModal({ type: 'editPerson', person: findPerson(id) })}
                            onCardClick={setHistoryPersonId} />
                    ))}
                    {filteredPeople.length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No people found</p>
                    )}
                </>
            )}

            {modal && (
                <Modal modal={modal} people={people} onClose={() => setModal(null)}
                    onAddPerson={handleAddPerson} onAddPoints={handleAddPoints}
                    onEditPerson={handleEditPerson} onDeletePerson={handleDeletePerson} />
            )}

            {historyPerson && (
                <HistoryModal person={historyPerson} onClose={() => setHistoryPersonId(null)} onTick={handleTick} />
            )}
        </div>
    )
}