import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerDeploy } from '../src/services/deployHook.js'

describe('triggerDeploy', () => {
  beforeEach(() => { vi.restoreAllMocks() })
  afterEach(() => { delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL })

  it('does nothing (no throw) when the hook URL is not configured', async () => {
    delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    await expect(triggerDeploy()).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('POSTs to the configured hook URL', async () => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = 'https://hook.example/deploy'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    await triggerDeploy()
    expect(fetchSpy).toHaveBeenCalledWith('https://hook.example/deploy', { method: 'POST' })
  })

  it('never throws even if the request fails', async () => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = 'https://hook.example/deploy'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(triggerDeploy()).resolves.toBeUndefined()
  })
})
