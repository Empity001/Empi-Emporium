// node scripts/sync-releases.mjs
// Saves the latest published releases of Empity001/EmpiLauncher into data/releases.json, the copy the page falls back to when GitHub's API
// cannot be reached from the visitor's browser (rate limit, network). Nothing is written when nothing changed, so the workflow makes no
// empty commits. Uses GITHUB_TOKEN / GH_TOKEN when there is one (a higher rate limit), and works without.
import fs from 'node:fs'

const REPO = 'Empity001/EmpiLauncher'
const target = new URL('../data/releases.json', import.meta.url)
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
})
if (!res.ok) { console.error(`GitHub answered ${res.status} ${res.statusText}`); process.exit(1) }

const releases = (await res.json())
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({
        tag_name: r.tag_name,
        name: r.name,
        published_at: r.published_at,
        html_url: r.html_url,
        body: r.body || '',
        assets: (r.assets || []).map((a) => ({ name: a.name, size: a.size, browser_download_url: a.browser_download_url }))
    }))
if (!releases.length) { console.error('GitHub returned no published releases; keeping the saved copy.'); process.exit(1) }

let before = null
try { before = JSON.parse(fs.readFileSync(target, 'utf8')) } catch { /* first run */ }
if (before && JSON.stringify(before.releases) === JSON.stringify(releases)) { console.log('Sin cambios.'); process.exit(0) }

fs.mkdirSync(new URL('../data/', import.meta.url), { recursive: true })
fs.writeFileSync(target, `${JSON.stringify({ repo: REPO, generatedAt: new Date().toISOString(), releases }, null, 2)}\n`)
console.log(`Guardadas ${releases.length} versiones, la última es ${releases[0].tag_name}.`)
