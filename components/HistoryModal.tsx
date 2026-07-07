'use client'
import { PersonWithEntries } from '@/lib/types'
import { isPointTicked, initials, avatarColor, fmtDate } from '@/lib/logic'

interface Props {
    person: PersonWithEntries
    onClose: () => void
    onTick: (personId: string, entryDate: string, pointIdx: number, ticked: boolean) => void
}

export default function HistoryModal({ person, onClose, onTick }: Props) {
    const [bg, fg] = avatarColor(person.name)
    const entries = [...person.entries].sort((a, b) => b.date.localeCompare(a.date))

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-start justify-center pt-16 px-4 z-50"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md shadow-lg flex flex-col max-h-[80vh]">
                <div className="flex items-center gap-3 p-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                        style={{ background: bg, color: fg }}
                    >
                        {initials(person.name)}
                    </div>
                    <h2 className="font-medium text-base flex-1 truncate dark:text-gray-100">{person.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-5">
                    {entries.length === 0 && (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No prayer points yet</p>
                    )}
                    {entries.map(entry => (
                        <div key={entry.id}>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{fmtDate(entry.date)}</p>
                            <div className="space-y-1.5">
                                {entry.points.map((pt, i) => {
                                    const ticked = isPointTicked(person.ticks, person.id, entry.date, i)
                                    return (
                                        <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={ticked}
                                                onChange={() => onTick(person.id, entry.date, i, ticked)}
                                                className="mt-0.5"
                                            />
                                            <span className={`text-sm leading-snug ${ticked ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {pt}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}