/* Empi Emporium: the small motion that answers the pointer. Vanilla, no dependencies.

   Three things, each with a reason:
     - the launcher in the hero leans toward the pointer on a damped spring (it is a picture of a window: it looks back at you);
     - modules and tiles catch a soft light where the pointer is (where you are);
     - the download button answers a click: a pink ring through the dot field, the arrow drops through the button and the label says
       it started (feedback: the browser's own download bar is easy to miss).

   Only fine pointers get the first two (touch fires false hovers), nothing runs unless the page is "vivo" (see field.js), and none of it
   costs anything at rest: the spring stops its own loop when it settles, and the light only moves when the pointer does. */
(() => {
    'use strict'
    const F = () => window.Field || { alive: () => false, burst() {}, tear() {}, scramble() {} }
    const fine = matchMedia('(hover: hover) and (pointer: fine)')

    // ---------------------------------------------------------------- the hero launcher leans toward the pointer
    function tilt() {
        const hero = document.querySelector('.hero')
        const shot = hero && hero.querySelector('.hero-shot')
        const frame = shot && shot.querySelector('.frame')
        if (!frame || !fine.matches) return

        const KEYS = ['rx', 'ry']
        const pos = { rx: 0, ry: 0 }, vel = { rx: 0, ry: 0 }, want = { rx: 0, ry: 0 }
        const K = 150, C = 15   // stiffness and damping: a little under critical, so it settles with one soft overshoot
        let raf = 0, last = 0

        function step(now) {
            const dt = Math.min(0.032, (now - last) / 1000 || 0.016)
            last = now
            let energy = 0
            for (const k of KEYS) {
                vel[k] += (-K * (pos[k] - want[k]) - C * vel[k]) * dt
                pos[k] += vel[k] * dt
                energy += Math.abs(vel[k]) + Math.abs(pos[k] - want[k])
            }
            frame.style.transform = `perspective(1400px) rotateX(${pos.rx.toFixed(3)}deg) rotateY(${pos.ry.toFixed(3)}deg)`
            if (energy > 0.015) raf = requestAnimationFrame(step)
            else { raf = 0; if (!want.rx && !want.ry) { frame.style.transform = ''; frame.style.willChange = '' } }
        }
        const run = () => { if (!raf) { last = performance.now(); frame.style.willChange = 'transform'; raf = requestAnimationFrame(step) } }
        const rest = () => { want.rx = want.ry = 0; if (raf || pos.rx || pos.ry) run() }

        hero.addEventListener('pointermove', (event) => {
            if (!F().alive() || document.hidden) return
            const r = shot.getBoundingClientRect()
            const nx = Math.max(-1, Math.min(1, (event.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.5)))
            const ny = Math.max(-1, Math.min(1, (event.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.5)))
            want.ry = nx * 4.5
            want.rx = -ny * 3.2
            run()
        }, { passive: true })
        hero.addEventListener('pointerleave', rest)
        // switching to "tranquilo" puts it back straight
        new MutationObserver(() => { if (!F().alive()) { rest() } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    }

    // ---------------------------------------------------------------- a soft light under the pointer on modules and tiles
    function spotlight() {
        if (!fine.matches) return
        const SEL = '.module:not(.tile-d), .tile'
        let event = null, raf = 0
        function apply() {
            raf = 0
            if (!event) return
            for (let el = event.target.closest && event.target.closest(SEL); el; el = el.parentElement && el.parentElement.closest(SEL)) {
                const r = el.getBoundingClientRect()
                el.style.setProperty('--px', `${Math.round(event.clientX - r.left)}px`)
                el.style.setProperty('--py', `${Math.round(event.clientY - r.top)}px`)
            }
        }
        document.addEventListener('pointermove', (e) => {
            if (!F().alive()) return
            event = e
            if (!raf) raf = requestAnimationFrame(apply)
        }, { passive: true })
    }

    // ---------------------------------------------------------------- the download button answers a click
    function download() {
        const status = document.getElementById('dlStatus')
        const timers = new WeakMap()
        document.addEventListener('click', (event) => {
            const a = event.target.closest && event.target.closest('[data-download]')
            // only when there is an installer to download: the fallback link opens a page, and "ya se baja" would not be true
            if (!a || !/\.exe($|\?)/i.test(a.href)) return
            F().burst(a)
            a.classList.remove('done'); void a.offsetWidth; a.classList.add('done')
            if (status) status.textContent = 'Empezó la descarga.'
            clearTimeout(timers.get(a))
            timers.set(a, setTimeout(() => { a.classList.remove('done'); if (status) status.textContent = '' }, 2600))
        })
    }

    tilt()
    spotlight()
    download()
})()
