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

    return (
        <div className="max-w-lg mx-auto p-4">
            <div className="flex flex-col items-center mb-4">
                <img src="../logo_full-512.png" alt="Pocket Prayer" className="h-20 w-20 mb-1" />
                <button onClick={handleSignOut} className="text-xs text-gray-400">Sign out</button>
            </div>

            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setTab('today')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'today' ? 'bg-highlight text-gray-800' : 'bg-gray-100'
                        }`}
                >
                    Today
                </button>

                <button
                    onClick={() => setTab('everyone')}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${tab === 'everyone' ? 'bg-highlight text-gray-800' : 'bg-gray-100'
                        }`}
                >
                    Everyone
                </button>

                <button
                    onClick={() => setModal({ type: 'addPerson' })}
                    className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-lg bg-gray-100"
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
                            <h2 className="text-xs font-medium text-gray-400 mt-6 mb-2">Time to catch up</h2>
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