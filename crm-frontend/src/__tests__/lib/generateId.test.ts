import { describe, it, expect } from 'vitest'
import { generateId } from '@/mock/customers'

describe('generateId', () => {
  it('generates prefixed IDs', () => {
    const id = generateId('cn')
    expect(id).toMatch(/^cn-/)
  })
  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('pm')))
    expect(ids.size).toBe(100)
  })
})
