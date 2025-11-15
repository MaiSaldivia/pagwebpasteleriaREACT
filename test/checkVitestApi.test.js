import * as V from 'vitest'
import { describe, it, expect } from 'vitest'

// Dump some info to debug why describe/it might not register
console.log('vitest-keys:', Object.keys(V))
console.log('describe-type:', typeof V.describe)

describe('vitest API check', () => {
  it('basic truth', () => {
    expect(true).toBe(true)
  })
})
