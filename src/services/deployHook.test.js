import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerDeploy } from './deployHook.js'

let errorSpy

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  errorSpy.mockRestore()
  delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
})

describe('triggerDeploy', () => {
  it('does nothing when the hook URL is not configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await triggerDeploy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs to the hook and stays silent on success', async () => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = 'https://example.com/hook'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    await triggerDeploy()
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/hook', { method: 'POST' })
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('logs HTTP failures (fetch does not throw on 4xx/5xx)', async () => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = 'https://example.com/hook'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' })
    )
    await triggerDeploy()
    expect(errorSpy).toHaveBeenCalled()
    expect(String(errorSpy.mock.calls[0])).toContain('429')
  })

  it('never throws on network error - a failed trigger must not fail the save', async () => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = 'https://example.com/hook'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    await expect(triggerDeploy()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
  })
})
