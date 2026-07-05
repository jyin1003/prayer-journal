'use client'
import { PersonWithEntries } from '@/lib/types'
import { getLatestEntry, isPointTicked, initials, avatarColor, fmtDate } from '@/lib/logic'

interface Props {
    person: PersonWithEntries
    isRandom?: boolean
    variant?: 'full' | 'compact'
    onTick?: (personId: string, entryDate: string, pointIdx: number, ticked: boolean) => void
    onAddPoints: (personId: string) => void
    onEdit: (personId: string) => void
    onCardClick?: (personId: string) => void
}

const STATUS_LABELS: Record<string, string> = { frequent: 'Frequent', longterm: 'Long-term', archived: 'Archived' }
const STATUS_CLASSES: Record<string, string> = {
    frequent: 'bg-blue-50 text-blue-800',
    longterm: 'bg-purple-50 text-purple-800',
    archived: 'bg-gray-100 text-gray-600',
}

export default function PersonCard({ person, isRandom, variant = 'full', onTick, onAddPoints, onEdit, onCardClick }: Props) {
    const entry = getLatestEntry(person)
    const [bg, fg] = avatarColor(person.name)
    const allTicked = entry ? entry.points.every((_, i) => isPointTicked(person.ticks, person.id, entry.date, i)) : false
    const isCompact = variant === 'compact'

    return (
        <div
            className={`rounded-xl border p-4 mb-3 transition-colors ${allTicked && !isCompact ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-white'} ${isCompact ? 'cursor-pointer hover:border-gray-300' : ''}`}
            onClick={isCompact ? () => onCardClick && onCardClick(person.id) : undefined}
        >
            <div className={`flex items-center gap-3 ${isCompact ? '' : 'mb-3'}`}>
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                    style={{ background: bg, color: fg }}
                >
                    {initials(person.name)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{person.name}</div>
                    {isRandom
                        ? <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">suggested</span>
                        : <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_CLASSES[person.status]}`}>{STATUS_LABELS[person.status]}</span>
                    }
                </div>
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => onAddPoints(person.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                        aria-label="Add prayer points"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <button
                        onClick={() => onEdit(person.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                        aria-label="Edit person"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                </div>
            </div>

            {!isCompact && (
                entry ? (
                    <>
                        <p className="text-xs text-gray-400 mb-2">{fmtDate(entry.date)}</p>
                        <div className="space-y-1.5">
                            {entry.points.map((pt, i) => {
                                const ticked = isPointTicked(person.ticks, person.id, entry.date, i)
                                return (
                                    <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={ticked}
                                            onChange={() => onTick && onTick(person.id, entry.date, i, ticked)}
                                            className="mt-0.5"
                                        />
                                        <span className={`text-sm leading-snug ${ticked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                            {pt}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-400">No prayer points yet</p>
                )
            )}
        </div>
    )
}