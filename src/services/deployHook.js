// Fire-and-forget trigger for the Cloudflare deploy hook. Must never throw:
// a failed rebuild trigger should not fail the author's save.
export async function triggerDeploy() {
  const url = process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  if (!url) return
  try {
    await fetch(url, { method: 'POST' })
  } catch (err) {
    console.error('Deploy hook failed:', err.message)
  }
}
