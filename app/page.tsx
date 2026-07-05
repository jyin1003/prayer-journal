'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PersonWithEntries, Status } from '@/lib/types'
import { getPrayerCandidates, getCatchupPeople } from '@/lib/logic'
import PersonCard from '@/components/PersonCard'
import Modal, { ModalState } from '@/components/Modal'

export default function Dashboard() {
    const [people, setPeople] = useState<PersonWithEntries[]>([])
    const [tab, setTab] = useState<'today' | 'everyone'>('today')
    const [modal, setModal] = useState<ModalState | null>(null)
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
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-400 dark:bg-gray-900 dark:text-gray-500">
            Loading…
        </div>
    )
    const candidates = getPrayerCandidates(people)
    const catchup = getCatchupPeople(people)
    const findPerson = (id: string) => people.find(p => p.id === id)!

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
                    onClick={() => setTab('today')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'today' ? 'bg-highlight text-gray-800' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                >
                    Today
                </button>

                <button
                    onClick={() => setTab('everyone')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'everyone' ? 'bg-highlight text-gray-800' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                >
                    Everyone
                </button>

                <button
                    onClick={() => setModal({ type: 'addPerson' })}
                    className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 dark:text-gray-200"
                >
                    + Add person
                </button>
            </div>

            {tab === 'today' && (
                <>
                    {candidates.map(({ person, isRandom }) => (
                        <PersonCard key={person.id} person={person} isRandom={isRandom} onTick={handleTick}
                            onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                            onEdit={id => setModal({ type: 'editPerson', person: findPerson(id) })} />
                    ))}
                    {catchup.length > 0 && (
                        <>
                            <h2 className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-6 mb-2">Time to catch up</h2>
                            {catchup.map(({ person }) => (
                                <PersonCard key={person.id} person={person} onTick={handleTick}
                                    onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                                    onEdit={id => setModal({ type: 'editPerson', person: findPerson(id) })} />
                            ))}
                        </>
                    )}
                </>
            )}

            {tab === 'everyone' && people.map(person => (
                <PersonCard key={person.id} person={person} onTick={handleTick}
                    onAddPoints={id => setModal({ type: 'addPoints', person: findPerson(id) })}
                    onEdit={id => setModal({ type: 'editPerson', person: findPerson(id) })} />
            ))}

            {modal && (
                <Modal modal={modal} people={people} onClose={() => setModal(null)}
                    onAddPerson={handleAddPerson} onAddPoints={handleAddPoints}
                    onEditPerson={handleEditPerson} onDeletePerson={handleDeletePerson} />
            )}
        </div>
    )
}