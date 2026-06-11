import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', ...opts
  })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function pct(p: number) {
  return `${Math.round(p * 100)}%`
}

export function goals(g: number) {
  return String(Math.round(g))
}

export const MODEL_LABELS: Record<string, string> = {
  A: 'Model A (Poisson)',
  B: 'Model B (ML)',
  C: 'Model C (Live)',
  hybrid: 'Hybrid',
}

export const MODEL_COLORS: Record<string, string> = {
  A: 'bg-blue-500',
  B: 'bg-purple-500',
  C: 'bg-green-500',
  hybrid: 'bg-orange-500',
}

export const MODEL_TEXT_COLORS: Record<string, string> = {
  A: 'text-blue-600',
  B: 'text-purple-600',
  C: 'text-green-600',
  hybrid: 'text-orange-600',
}

export const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Final',
  sf: 'Semi-Final',
  final: 'Final',
}
