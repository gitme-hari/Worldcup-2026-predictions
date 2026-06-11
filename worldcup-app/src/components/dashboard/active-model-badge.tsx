'use client'
import { useEffect, useState } from 'react'
import { getConfig } from '@/lib/store'
import { MODEL_LABELS, MODEL_COLORS } from '@/lib/utils'
import Link from 'next/link'

export function ActiveModelBadge() {
  const [model, setModel] = useState('A')

  useEffect(() => {
    setModel(getConfig().active_model)
  }, [])

  return (
    <Link href="/settings" className="shrink-0">
      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-white ${MODEL_COLORS[model]}`}>
        <span className="hidden sm:inline">{MODEL_LABELS[model]}</span>
        <span className="sm:hidden">{model === 'hybrid' ? 'HYB' : `Mdl ${model}`}</span>
      </span>
    </Link>
  )
}
