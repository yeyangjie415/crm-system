export type ValidationError = string | null

export function required(value: string, label: string): ValidationError {
  if (!value || !value.trim()) return `请输入${label}`
  return null
}

export function positiveNumber(value: string, label: string): ValidationError {
  if (!value) return null // handled by required
  const n = Number(value)
  if (isNaN(n) || n <= 0) return `${label}必须大于0`
  return null
}

export function minLength(value: string, min: number, label: string): ValidationError {
  if (!value) return null
  if (value.trim().length < min) return `${label}至少${min}个字符`
  return null
}

export function notBeforeToday(dateStr: string, label: string): ValidationError {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  if (d < today) return `${label}不能早于今天`
  return null
}

/** Run multiple validators, return first error or null */
export function validate(value: string, label: string, rules: Array<(value: string, label: string) => ValidationError>): ValidationError {
  for (const rule of rules) {
    const error = rule(value, label)
    if (error) return error
  }
  return null
}
