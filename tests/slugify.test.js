import { describe, it, expect } from 'vitest'
import { slugify } from '../src/utils/slugify.js'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('New Pokemon Release')).toBe('new-pokemon-release')
  })
  it('strips accents (French content)', () => {
    expect(slugify('Édition Spéciale Évoli')).toBe('edition-speciale-evoli')
  })
  it('removes punctuation and collapses separators', () => {
    expect(slugify('Coffret 151 : édition !! limitée')).toBe('coffret-151-edition-limitee')
  })
  it('trims leading/trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello')
  })
})
