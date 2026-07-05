'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PersonWithEntries, Status } from '@/lib/types'
import { getPrayerCandidates, getCatchupPeople } from '@/lib/logic'
import PersonCard from '@/components/PersonCard'
import Modal, { ModalState } from '@/components/Modal'
import HistoryModal from '@/components/HistoryModal'

export default function Dashboard() {
    const [people, setPeople] = useState<PersonWithEntries[]>([])
    const [tab, setTab] = useState<'prayers' | 'people'>('prayers')
    const [modal, setModal] = useState<ModalState | null>(null)
    const [historyPersonId, setHistoryPersonId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
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
    useEffect(() => { load() }, [])

    async function handleTick(personId: string, entryDate: string, pointIdx: number, ticked: boolean) {
        await fetch('/api/ticks', { method: ticked ? 'DELETE' : 'POST', body: JSON.stringify({ person_id: personId, entry_date: entryDate, point_index: pointIdx }) })
        load()
    }
    async function handleAddPerson(name: string, status: Status, points: string[]) {
        await fetch('/api/people', { method: 'POST', body: JSON.stringify({ name, status, points }) })
        load()
    }
    async function handleAddPoints(personId: string, points: string[]) {
        await fetch('/api/entries', { method: 'POST', body: JSON.stringify({ person_id: personId, points }) })
        load()
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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
            Loading…
        </div>
    )
    const candidates = getPrayerCandidates(people)
    const catchup = getCatchupPeople(people)
    const findPerson = (id: string) => people.find(p => p.id === id)!
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
                <button onClick={handleSignOut} className="text-xs text-gray-400">Sign out</button>
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setTab('prayers')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'prayers' ? 'bg-highlight text-gray-800' : 'bg-gray-100'}`}
                >
                    Prayers
                </button>

                <button
                    onClick={() => setTab('people')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'people' ? 'bg-highlight text-gray-800' : 'bg-gray-100'}`}
                >
                    People
                </button>

                {tab === 'prayers' && (
                    <button
                        onClick={() => setModal({ type: 'addPerson' })}
                        className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-100"
                    >
                        + Add person
                    </button>
                )}
            </div>

            {tab === 'prayers' && (
                <>
                    {candidates.map(({ person, isRandom }) => (
                        <PersonCard key={person.id} person={person} isRandom={isRandom} onTick={handleTick}
                            onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                            onEdit={id => setModal({ type: 'editPerson', person: findPerson(id) })} />
                    ))}

                    <h2 className="text-xs font-medium text-gray-400 mt-6 mb-2">Time to catch up</h2>
                    {catchup.length > 0 ? (
                        catchup.map(({ person }) => (
                            <PersonCard key={person.id} person={person} onTick={handleTick}
                                onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                                onEdit={id => setModal({ type: 'editPerson', person: findPerson(id) })} />
                        ))
                    ) : (
                        <p className="text-sm text-gray-400">None so far :)</p>
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
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                        <button
                            onClick={() => setModal({ type: 'addPerson' })}
                            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white"
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
                        <p className="text-sm text-gray-400">No people found</p>
                    )}
                </>
            )}

            {modal && (
                <Modal modal={modal} people={people} onClose={() => setModal(null)}
                    onAddPerson={handleAddPerson} onAddPoints={handleAddPoints}
                    onEditPerson={handleEditPerson} onDeletePerson={handleDeletePerson} />
            )}

            {historyPerson && (
                <HistoryModal person={historyPerson} onClose={() => setHistoryPersonId(null)} />
            )}
        </div>
    )
}