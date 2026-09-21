/* Turns the notes of a GitHub release (a little Markdown: a title, ## headings, - lists, **bold**, `code`, [links](https://...)) into safe HTML.
   Everything is escaped first, so text from a release can never add markup of its own. */
(() => {
    'use strict'

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    function inline(text) {
        return esc(text)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    }

    /** "Empi Launcher 3.5.3: te avisa de..." becomes "Te avisa de...": the version is already shown next to it (and the tag is the truth). */
    function cleanTitle(title) {
        const m = title.match(/^(?:Empi\s+Launcher\s+)?v?\d+(?:\.\d+){1,3}\s*[:\-]\s*(.+)$/i)
        const s = (m ? m[1] : title).trim()
        return s.charAt(0).toUpperCase() + s.slice(1)
    }

    /** { summary: plain text of the first "# " line, html: the rest }. */
    function parse(body) {
        const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n')
        let i = 0
        while (i < lines.length && !lines[i].trim()) i++
        let summary = ''
        const h1 = (lines[i] || '').match(/^#\s+(.*)$/)
        if (h1) { summary = cleanTitle(h1[1].trim()); i++ }

        const html = []
        let list = null
        let para = []
        const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para = [] } }
        const flushList = () => { if (list) { html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null } }

        for (; i < lines.length; i++) {
            const line = lines[i]
            const t = line.trim()
            let m
            if (!t) { flushPara(); flushList(); continue }
            if ((m = t.match(/^#{2,4}\s+(.*)$/))) { flushPara(); flushList(); html.push(`<h4>${inline(m[1])}</h4>`); continue }
            if ((m = t.match(/^[-*+]\s+(.*)$/))) { flushPara(); if (!list) list = []; list.push(m[1]); continue }
            if (list && /^\s+\S/.test(line)) { list[list.length - 1] += ` ${t}`; continue }   // a wrapped list item
            flushList()
            para.push(t)
        }
        flushPara(); flushList()
        return { summary, html: html.join('') }
    }

    window.EmpiNotes = { parse }
})()
