'use client'

import { useRouter } from 'next/navigation'

type BidOption = { id: string; sr: number; name: string }

export default function BidSelector({ bids, selectedId }: { bids: BidOption[]; selectedId?: string }) {
  const router = useRouter()
  return (
    <label className="input-label" style={{ display: 'block' }}>
      Select Saved Project
      <select
        className="field"
        value={selectedId ?? ''}
        onChange={e => {
          const v = e.target.value
          router.push(v ? `/predictor?id=${v}` : '/predictor')
        }}
      >
        <option value="">— Choose a saved bid —</option>
        {bids.map(b => (
          <option key={b.id} value={b.id}>#{b.sr} · {b.name}</option>
        ))}
      </select>
    </label>
  )
}
