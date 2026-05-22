import React from 'react'

function inline(s: string, ns: string): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/)
  return parts.map((p, i) => {
    const k = `${ns}-${i}`
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={k}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={k} className="md-code">{p.slice(1, -1)}</code>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={k}>{p.slice(1, -1)}</em>
    return p
  })
}

export function renderMd(text: string): React.ReactNode {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let n = 0, i = 0

  while (i < lines.length) {
    const l = lines[i]

    if (!l.trim()) { i++; continue }

    // Fenced code block
    if (l.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++ }
      i++
      out.push(<pre key={n++} className="md-pre"><code>{code.join('\n')}</code></pre>)
      continue
    }

    // Heading
    const hm = l.match(/^(#{1,4})\s+(.+)/)
    if (hm) {
      const lv = hm[1].length
      const content = inline(hm[2], `h${n}`)
      const tag = (['h2','h3','h4','h5'] as const)[lv - 1] ?? 'h5'
      out.push(React.createElement(tag, { key: n++, className: `md-h${lv}` }, content))
      i++; continue
    }

    // HR
    if (/^---+$/.test(l)) {
      out.push(<hr key={n++} className="md-hr" />)
      i++; continue
    }

    // UL
    if (/^[-*+]\s/.test(l)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^[-*+]\s/, ''), `ul${i}`)}</li>)
        i++
      }
      out.push(<ul key={n++} className="md-ul">{items}</ul>)
      continue
    }

    // OL
    if (/^\d+\.\s/.test(l)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^\d+\.\s/, ''), `ol${i}`)}</li>)
        i++
      }
      out.push(<ol key={n++} className="md-ol">{items}</ol>)
      continue
    }

    // Paragraph — collect consecutive non-block lines
    const plines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('```') &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^---+$/.test(lines[i])
    ) { plines.push(lines[i]); i++ }

    if (plines.length) {
      const key = n++
      out.push(
        <p key={key} className="md-p">
          {plines.flatMap((pl, pi) =>
            pi === 0
              ? inline(pl, `p${key}-${pi}`)
              : [<br key={`br-${key}-${pi}`} />, ...inline(pl, `p${key}-${pi}`)]
          )}
        </p>
      )
    }
  }

  return <div className="md-body">{out}</div>
}
