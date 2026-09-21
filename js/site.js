/* Empi Emporium: the download button and the novedades, always the latest release of Empity001/EmpiLauncher.

   Where the data comes from, in order:
     1. the browser's own copy, if it is less than 10 minutes old (GitHub allows 60 unauthenticated requests an hour per address);
     2. GitHub's releases API, asked live: a release published a minute ago is here a minute later, with no change to this page;
     3. data/releases.json, a copy that a GitHub Action refreshes (see scripts/sync-releases.mjs), when GitHub cannot be reached or says "enough";
     4. nothing: the button still works, because it points at GitHub's "latest release" page until a real installer link is known. */
(() => {
    'use strict'
    const REPO = 'Empity001/EmpiLauncher'
    const API = `https://api.github.com/repos/${REPO}/releases?per_page=12`
    const RELEASES_PAGE = `https://github.com/${REPO}/releases`
    const CACHE_KEY = 'empi.emporium.releases'
    const CACHE_MS = 10 * 60 * 1000
    const SHOWN = 8   // versions in the rail

    const $ = (id) => document.getElementById(id)
    const Field = () => window.Field || { tear() {}, scramble() {}, burst() {}, refresh() {}, alive: () => false }
    const date = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })
    const dateLong = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' })
    const ago = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

    // ---------------------------------------------------------------- data
    /** What the page needs from a release (the same shape whether it came from the API or from the saved copy). */
    function normalize(list) {
        return (Array.isArray(list) ? list : [])
            .filter((r) => r && !r.draft && !r.prerelease && r.tag_name)
            .map((r) => {
                const asset = (r.assets || []).find((a) => /^Empi-Launcher-setup-.+\.exe$/i.test(a.name))
                return {
                    version: String(r.tag_name).replace(/^v/i, ''),
                    date: r.published_at || null,
                    url: r.html_url || `${RELEASES_PAGE}/tag/${r.tag_name}`,
                    body: String(r.body || ''),
                    installer: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url } : null
                }
            })
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    }

    const readCache = () => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); return c && Array.isArray(c.list) && c.list.length ? c : null } catch { return null } }
    const writeCache = (list) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list })) } catch { /* private window */ } }

    async function getJson(url, timeout) {
        const ctl = new AbortController()
        const timer = setTimeout(() => ctl.abort(), timeout)
        try {
            const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/vnd.github+json' } })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return await res.json()
        } finally { clearTimeout(timer) }
    }

    // ---------------------------------------------------------------- the page
    let releases = []
    let selected = 0
    let shown = null   // what the facts and the buttons currently say, to notice when a newer release arrives
    let rung = false   // the first ring through the dots (from the download button) has been sent

    const sizeMb = (bytes) => `${Math.round(bytes / 1048576)} MB`

    function setDownload(release) {
        const href = release && release.installer ? release.installer.url : release ? release.url : `${RELEASES_PAGE}/latest`
        for (const a of document.querySelectorAll('[data-download]')) a.href = href
    }

    function renderFacts(release) {
        const version = $('factVersion'), file = $('factFile'), when = $('factDate'), agoLine = $('factAgo'), size = $('factSize')
        const set = (el, text) => { el.textContent = text; el.classList.remove('skel', 'skel-line') }
        set(version, release.version)
        set(file, release.installer ? release.installer.name : 'Instalador en GitHub')
        if (release.date) {
            set(when, date.format(new Date(release.date)))
            const days = Math.round((new Date(release.date) - Date.now()) / 86400000)
            const hours = Math.round((new Date(release.date) - Date.now()) / 3600000)
            set(agoLine, Math.abs(hours) < 24 ? (hours === 0 ? 'Hace un momento' : ago.format(hours, 'hour')) : ago.format(days, 'day'))
        } else { set(when, 'Sin fecha'); set(agoLine, '') }
        set(size, release.installer ? sizeMb(release.installer.size) : 'En GitHub')
    }

    /** Nothing could be loaded: the tiles say so instead of pulsing for ever. */
    function renderFactsUnknown() {
        for (const id of ['factVersion', 'factDate', 'factSize']) { const el = $(id); el.textContent = '-'; el.classList.remove('skel') }
        for (const id of ['factFile', 'factAgo']) { const el = $(id); el.textContent = 'Sin datos'; el.classList.remove('skel-line') }
    }

    let thumbPlaced = false
    /** The paper block behind the chosen version slides to it (it appears in place the first time, and when the rail is resized). */
    function placeThumb(instant) {
        const rail = $('rail'), thumb = rail.querySelector('.rail-thumb'), item = rail.querySelector('.rail-item[aria-selected="true"]')
        if (!thumb || !item) return
        const still = instant || !thumbPlaced
        if (still) thumb.style.transition = 'none'
        thumb.style.width = `${item.offsetWidth}px`
        thumb.style.height = `${item.offsetHeight}px`
        thumb.style.transform = `translate(${item.offsetLeft}px, ${item.offsetTop}px)`
        thumb.style.opacity = '1'
        if (still) { void thumb.offsetWidth; thumb.style.transition = '' }
        thumbPlaced = true
    }

    let factsSeen = false, decodedFor = null
    /** The three numerals of the latest version decode out of noise, once, when they are in view and their value is known. */
    function decodeFacts() {
        if (!factsSeen || !shown || decodedFor === shown) return
        decodedFor = shown
        ;['factVersion', 'factDate', 'factSize'].forEach((id, i) => Field().scramble($(id), 620, i * 110))
    }

    function renderRail() {
        const rail = $('rail')
        rail.replaceChildren()
        const thumb = document.createElement('i')
        thumb.className = 'rail-thumb'
        thumb.setAttribute('aria-hidden', 'true')
        rail.append(thumb)
        thumbPlaced = false
        releases.slice(0, SHOWN).forEach((release, i) => {
            const b = document.createElement('button')
            b.type = 'button'
            b.className = 'rail-item'
            b.setAttribute('role', 'tab')
            b.id = `tab-${i}`
            b.setAttribute('aria-controls', 'reader')
            b.dataset.i = String(i)
            b.innerHTML = `<span class="rv"></span><span class="rd"></span>${i === 0 ? '<span class="rc chip">Última</span>' : ''}`
            b.querySelector('.rv').textContent = release.version
            b.querySelector('.rd').textContent = release.date ? date.format(new Date(release.date)) : ''
            rail.append(b)
        })
        if (releases.length > SHOWN) {
            const more = document.createElement('a')
            more.className = 'link rail-more'
            more.href = RELEASES_PAGE
            more.target = '_blank'
            more.rel = 'noopener'
            more.textContent = 'Más versiones en GitHub'
            rail.append(more)
        }
    }

    function renderReader(animate) {
        const reader = $('reader'), release = releases[selected]
        if (!release) return
        const { summary, html } = window.EmpiNotes.parse(release.body)
        reader.replaceChildren()
        const head = document.createElement('header')
        head.className = 'reader-head'
        head.innerHTML = '<p class="reader-num"></p><div class="reader-meta"><time></time><a class="link" target="_blank" rel="noopener">Ver en GitHub</a></div>'
        head.querySelector('.reader-num').textContent = release.version
        const time = head.querySelector('time')
        if (release.date) { time.dateTime = release.date; time.textContent = dateLong.format(new Date(release.date)) }
        head.querySelector('a').href = release.url
        reader.append(head)
        if (summary) {
            const h = document.createElement('h3')
            h.className = 'reader-summary'
            h.textContent = summary
            reader.append(h)
        }
        const body = document.createElement('div')
        body.className = 'notes-body'
        body.innerHTML = html || '<p>Esta versión salió sin notas, se me pasó.</p>'
        reader.append(body)
        reader.setAttribute('aria-labelledby', `tab-${selected}`)
        if (animate) {
            for (const el of reader.children) {
                if (el.classList.contains('notes-body')) continue
                el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap')
            }
            // the lines of the notes arrive one after another (a short stagger, capped)
            body.classList.add('stagger')
            let n = 0
            for (const el of body.querySelectorAll('h4, p, li')) el.style.setProperty('--i', String(Math.min(n++, 14)))
            setTimeout(() => body.classList.remove('stagger'), 1400)
            Field().tear(reader.querySelector('.reader-num'))
        }
        for (const b of $('rail').querySelectorAll('.rail-item')) {
            const on = Number(b.dataset.i) === selected
            b.setAttribute('aria-selected', String(on))
            b.tabIndex = on ? 0 : -1
        }
        placeThumb(!animate)
    }

    function select(i, animate = true) {
        if (i < 0 || i >= Math.min(releases.length, SHOWN) || (i === selected && animate)) return
        selected = i
        renderReader(animate)
        Field().refresh()
    }

    function render(list, source) {
        const arrived = list.length ? list[0].version : null
        const changed = shown !== null && shown !== arrived
        releases = list
        shown = arrived
        selected = 0
        setDownload(list[0])
        if (!list.length) { renderError(); return }
        renderFacts(list[0])
        renderRail()
        renderReader(false)
        decodeFacts()
        $('sourceNote').hidden = true
        if (changed) {
            // a newer release than the one on screen just arrived: the numerals tear once
            Field().tear($('factVersion')); Field().tear(document.querySelector('.reader-num')); Field().burst(document.querySelector('[data-download]'))
        }
        if (source === 'snapshot') {
            const note = $('sourceNote')
            note.textContent = 'GitHub no me contestó, así que te enseño la última copia que guardé. Puede que falte la versión más nueva.'
            note.hidden = false
        }
        if (!rung) {
            rung = true
            setTimeout(() => {
                const cta = document.querySelector('.hero [data-download]'), r = cta && cta.getBoundingClientRect()
                if (r && r.bottom > 0 && r.top < window.innerHeight) Field().burst(cta)   // "your download is ready"
            }, 500)
        }
        Field().refresh()
    }

    function renderError() {
        const reader = $('reader')
        reader.replaceChildren()
        const box = document.createElement('div')
        box.className = 'reader-error'
        renderFactsUnknown()
        box.innerHTML = `<p>Se me trabó cargando las novedades. Las puedes leer directo en GitHub.</p><a class="btn" target="_blank" rel="noopener" href="${RELEASES_PAGE}">Abrir los releases</a>`
        reader.append(box)
        $('rail').replaceChildren()
        Field().refresh()
    }

    // ---------------------------------------------------------------- loading
    async function load() {
        const cached = readCache()
        if (cached) render(cached.list, 'cache')
        if (cached && Date.now() - cached.at < CACHE_MS) return
        try {
            const live = normalize(await getJson(API, 8000))
            if (!live.length) throw new Error('no releases')
            writeCache(live)
            render(live, 'live')
        } catch {
            if (cached) return   // an older copy of the truth is on screen already
            try {
                const snapshot = normalize((await getJson('data/releases.json', 8000)).releases)
                if (!snapshot.length) throw new Error('empty snapshot')
                render(snapshot, 'snapshot')
            } catch { render([], 'none') }
        }
    }

    // ---------------------------------------------------------------- the rail: click and arrow keys
    $('rail').addEventListener('click', (event) => {
        const b = event.target.closest('.rail-item')
        if (b) select(Number(b.dataset.i))
    })
    $('rail').addEventListener('keydown', (event) => {
        const horizontal = matchMedia('(max-width: 1000px)').matches
        const next = { ArrowDown: !horizontal, ArrowRight: horizontal, ArrowUp: false, ArrowLeft: false }
        const prev = { ArrowUp: !horizontal, ArrowLeft: horizontal, ArrowDown: false, ArrowRight: false }
        let to = null
        if (next[event.key]) to = selected + 1
        else if (prev[event.key]) to = selected - 1
        else if (event.key === 'Home') to = 0
        else if (event.key === 'End') to = Math.min(releases.length, SHOWN) - 1
        if (to === null) return
        event.preventDefault()
        select(Math.max(0, Math.min(to, Math.min(releases.length, SHOWN) - 1)))
        const b = $('rail').querySelector(`[data-i="${selected}"]`)
        if (b) { b.focus(); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }
    })

    // ---------------------------------------------------------------- arrivals: things rise in as they come into view, once
    function reveal() {
        const items = document.querySelectorAll('.reveal')
        if (!('IntersectionObserver' in window)) { for (const el of items) el.classList.add('in'); factsSeen = true; return }
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue
                e.target.classList.add('in'); io.unobserve(e.target)
                if (e.target.classList.contains('display')) Field().scramble(e.target, 640, 120)
                if (e.target.id === 'descarga') { factsSeen = true; decodeFacts() }
            }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
        for (const el of items) io.observe(el)
        // the field goes quiet under text that has just arrived
        setTimeout(() => Field().refresh(), 900)
    }

    // ---------------------------------------------------------------- start
    function start() {
        reveal()
        // the title decodes out of noise once, and tears once when it is done
        const lines = document.querySelectorAll('.hero-title .line')
        lines.forEach((line, i) => setTimeout(() => Field().scramble(line, 560), 220 + i * 140))
        setTimeout(() => Field().tear(document.querySelector('.hero-title')), 220 + 560 + 200)
        setTimeout(() => Field().tear(document.querySelector('.hero .frame')), 1300)
        if ('ResizeObserver' in window) new ResizeObserver(() => placeThumb(true)).observe($('rail'))
        load()
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
})()
