import { describe, it, expect } from 'vitest'
import { formatLargeAmount, formatAmount, getDeadlineLabel, cn } from '@/lib/utils'

describe('formatLargeAmount', () => {
  it('formats amounts >= 1万 as X.X万', () => {
    expect(formatLargeAmount(580000)).toBe('¥58.0万')
    expect(formatLargeAmount(3500000)).toBe('¥350.0万')
  })
  it('formats amounts >= 1亿 as X.X亿', () => {
    expect(formatLargeAmount(150000000)).toBe('¥1.5亿')
  })
  it('formats amounts < 1万 with toLocaleString', () => {
    expect(formatLargeAmount(5000)).toBe('¥5,000')
    expect(formatLargeAmount(0)).toBe('¥0')
  })
})

describe('formatAmount', () => {
  it('formats integer amounts', () => {
    expect(formatAmount(1234)).toBe('¥1,234')
  })
  it('formats zero', () => {
    expect(formatAmount(0)).toBe('¥0')
  })
  it('formats large amounts', () => {
    expect(formatAmount(1000000)).toBe('¥1,000,000')
  })
})

describe('getDeadlineLabel', () => {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const offset = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return fmt(d)
  }

  it('returns "已逾期" for past dates', () => {
    const result = getDeadlineLabel(offset(-1))
    expect(result.label).toBe('已逾期')
    expect(result.color).toContain('red')
  })

  it('returns "今天" for today', () => {
    const result = getDeadlineLabel(offset(0))
    expect(result.label).toBe('今天')
    expect(result.color).toContain('red')
  })

  it('returns "明天" for tomorrow', () => {
    const result = getDeadlineLabel(offset(1))
    expect(result.label).toBe('明天')
    expect(result.color).toContain('amber')
  })

  it('returns "本周" for dates within 7 days', () => {
    const result = getDeadlineLabel(offset(5))
    expect(result.label).toBe('本周')
    expect(result.color).toContain('slate')
  })

  it('returns the raw date string for dates beyond 7 days', () => {
    const farDate = offset(10)
    const result = getDeadlineLabel(farDate)
    expect(result.label).toBe(farDate)
    expect(result.color).toContain('slate')
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('resolves tailwind conflicts via twMerge', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})
