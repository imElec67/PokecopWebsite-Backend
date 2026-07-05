// Fire-and-forget trigger for the Cloudflare deploy hook. Must never throw:
// a failed rebuild trigger should not fail the author's save.
export async function triggerDeploy() {
  const url = process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  if (!url) return
  try {
    const res = await fetch(url, { method: 'POST' })
    // fetch resolves on 4xx/5xx (rate limit, expired token…) - without this
    // check a refused rebuild would pass for a success and the site would
    // silently keep serving the previous build
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`Deploy hook failed: HTTP ${res.status} ${body.slice(0, 300)}`)
    }
  } catch (err) {
    console.error('Deploy hook failed:', err.message)
  }
}
