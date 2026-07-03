'use client'
import { useState, useEffect } from 'react'
import { Person, Status } from '@/lib/types'

interface AddPointsModal {
    type: 'addPoints'
    person: Person
}
interface AddPersonModal {
    type: 'addPerson'
}
interface EditPersonModal {
    type: 'editPerson'
    person: Person
}

export type ModalState = AddPointsModal | AddPersonModal | EditPersonModal

interface Props {
    modal: ModalState
    people: Person[]
    onClose: () => void
    onAddPerson: (name: string, status: Status, points: string[]) => Promise<void>
    onAddPoints: (personId: string, points: string[]) => Promise<void>
    onEditPerson: (personId: string, name: string, status: Status) => Promise<void>
    onDeletePerson: (personId: string) => Promise<void>
}

export default function Modal({ modal, people, onClose, onAddPerson, onAddPoints, onEditPerson, onDeletePerson }: Props) {
    const [name, setName] = useState('')
    const [status, setStatus] = useState<Status>('frequent')
    const [pointsText, setPointsText] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedPersonId, setSelectedPersonId] = useState('')

    useEffect(() => {
        if (modal.type === 'editPerson') {
            setName(modal.person.name)
            setStatus(modal.person.status)
        }
        if (modal.type === 'addPoints') {
            setSelectedPersonId(modal.person.id)
        }
    }, [modal])

    async function handleSubmit() {
        setLoading(true)
        try {
            if (modal.type === 'addPerson') {
                const pts = pointsText.split('\n').map(l => l.replace(/^[-•*]\s*/, '')).filter(Boolean)
                if (!name.trim()) { alert('Enter a name'); setLoading(false); return }
                if (!pts.length) { alert('Add at least one prayer point'); setLoading(false); return }
                await onAddPerson(name.trim(), status, pts)
            } else if (modal.type === 'addPoints') {
                const pts = pointsText.split('\n').map(l => l.replace(/^[-•*]\s*/, '')).filter(Boolean)
                if (!pts.length) { alert('Add at least one prayer point'); setLoading(false); return }
                await onAddPoints(modal.person.id, pts)
            } else if (modal.type === 'editPerson') {
                if (!name.trim()) { alert('Enter a name'); setLoading(false); return }
                await onEditPerson(modal.person.id, name.trim(), status)
            }
            onClose()
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        if (modal.type !== 'editPerson') return
        if (!confirm(`Remove ${modal.person.name} and all their prayer points?`)) return
        setLoading(true)
        await onDeletePerson(modal.person.id)
        setLoading(false)
        onClose()
    }

    const title = modal.type === 'addPerson' ? 'Add person'
        : modal.type === 'addPoints' ? `Add points — ${modal.person.name}`
            : 'Edit person'

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-start justify-center pt-16 px-4 z-50"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md shadow-lg">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-medium text-base">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {(modal.type === 'addPerson' || modal.type === 'editPerson') && (
                        <>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Full name"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5">Status</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as Status)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                >
                                    <option value="frequent">Frequent — appears in daily rotation</option>
                                    <option value="longterm">Long-term — appears occasionally</option>
                                    <option value="archived">Archived — hidden until promoted</option>
                                </select>
                            </div>
                        </>
                    )}

                    {modal.type !== 'editPerson' && (
                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Prayer points</label>
                            <textarea
                                value={pointsText}
                                onChange={e => setPointsText(e.target.value)}
                                placeholder={"One point per line\ne.g. new job search\nhealth concerns\nfamily reconciliation"}
                                rows={5}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                                autoFocus={modal.type === 'addPoints'}
                            />
                            <p className="text-xs text-gray-400 mt-1">One point per line</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-6">
                    <div>
                        {modal.type === 'editPerson' && (
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-2 disabled:opacity-50"
                            >
                                Delete person
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="text-sm border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                        >
                            {loading ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}