// A God's Eye View tool answer (the boundary decoder), read from the MCP result text Hermes hands the transcript: the
// app's own one-line summary, its structured content (rows, total) and the view it puts on the
// globe. Every GEV answer carries `view.url`, the real app's share link; nothing here is invented.

export interface GevAnswer {
  readonly tool: string
  readonly summary: string
  /** The real app's share URL for this answer (`#v=2&lat=…`). */
  readonly url: string
  readonly layers: readonly string[]
  readonly total: number | undefined
  readonly rows: readonly Readonly<Record<string, unknown>>[]
}

/** `mcp__gev__get_earthquakes` (Hermes' MCP naming; older builds use single `_`) → `get_earthquakes`. */
export function gevTool(name: string): string | undefined {
  return /^mcp__?(?:gev|gods[-_]eye[-_]view)__?(.+)$/.exec(name)?.[1]
}

/** The GEV tool a call ran: its own name, or the first GEV call inside the deferred-tool bridge (`tool_call`). */
export function gevCallName(name: string, args: Readonly<Record<string, unknown>>): string | undefined {
  if (gevTool(name)) return name
  if (name !== 'tool_call' || !Array.isArray(args['calls'])) return undefined
  for (const c of args['calls']) {
    const inner = isObj(c) && typeof c['name'] === 'string' ? c['name'] : undefined
    if (inner && gevTool(inner)) return inner
  }
  return undefined
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const hasView = (v: unknown): v is Obj & { view: Obj & { url: string } } =>
  isObj(v) && isObj(v['view']) && typeof v['view']['url'] === 'string' && v['view']['url'].includes('#v=')

/** The first object with a GEV view, in parsed JSON or JSON embedded in text. */
function findStructured(v: unknown, depth = 0): (Obj & { view: Obj & { url: string } }) | undefined {
  if (depth > 8) return undefined
  if (hasView(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    for (let i = t.indexOf('{'); i >= 0; i = t.indexOf('{', i + 1)) {
      try {
        const hit = findStructured(JSON.parse(t.slice(i, matchBrace(t, i) + 1)), depth + 1)
        if (hit) return hit
      } catch { /* not JSON from here */ }
    }
    return undefined
  }
  const kids = Array.isArray(v) ? v : isObj(v) ? Object.values(v) : []
  for (const k of kids) {
    const hit = findStructured(k, depth + 1)
    if (hit) return hit
  }
  return undefined
}

/** Index of the brace closing the one at `open`, string-aware; the end of text when unbalanced. */
function matchBrace(t: string, open: number): number {
  let d = 0, str = false
  for (let i = open; i < t.length; i++) {
    const c = t[i]
    if (str) { if (c === '\\') i++; else if (c === '"') str = false; continue }
    if (c === '"') str = true
    else if (c === '{') d++
    else if (c === '}' && --d === 0) return i
  }
  return t.length - 1
}

/** The app's prose summary: the first line that is not JSON. */
function findSummary(v: unknown, depth = 0): string | undefined {
  if (depth > 8) return undefined
  if (typeof v === 'string') {
    const t = v.trim()
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return findSummary(JSON.parse(t), depth + 1) } catch { /* prose that starts with a brace */ }
    }
    const line = t.split('\n').map(s => s.trim()).find(s => s && !s.startsWith('{') && !s.startsWith('['))
    return line
  }
  if (Array.isArray(v)) {
    for (const k of v) { const s = findSummary(k, depth + 1); if (s) return s }
    return undefined
  }
  if (isObj(v)) {
    for (const key of ['text', 'content', 'result', 'summary']) {
      const s = v[key] === undefined ? undefined : findSummary(v[key], depth + 1)
      if (s) return s
    }
  }
  return undefined
}

/** The payload inside Hermes' `<untrusted_tool_result>` safety envelope (its preamble is not the app's prose). */
function unwrap(text: string | undefined): string | undefined {
  const m = text === undefined ? null : /^\s*<untrusted_tool_result\b[^>]*>([\s\S]*?)(?:<\/untrusted_tool_result>\s*)?$/.exec(text)
  if (!m?.[1]) return text
  const body = m[1]
  const json = body.search(/^\s*[{[]/m)
  return json >= 0 ? body.slice(json).trim() : body.trim()
}

export function gevAnswer(name: string, result: unknown, rawText: string | undefined): GevAnswer | undefined {
  const tool = gevTool(name)
  if (!tool) return undefined
  const resultText = unwrap(rawText)
  const sc = findStructured(result) ?? findStructured(resultText)
  if (!sc) return undefined
  const view = sc.view
  const rows = Array.isArray(sc['rows']) ? sc['rows'].filter(isObj) : []
  return {
    tool,
    summary: findSummary(resultText) ?? findSummary(result) ?? '',
    url: view.url,
    layers: Array.isArray(view['layers']) ? view['layers'].filter((l): l is string => typeof l === 'string') : [],
    total: typeof sc['total'] === 'number' ? sc['total'] : rows.length || undefined,
    rows
  }
}

/** The same view in the app's embed mode: the bare globe, no HUD chrome. */
export function embedUrl(url: string): string {
  const u = new URL(url)
  u.searchParams.set('embed', '1')
  return u.toString()
}

/** A `tern browser` answer: its `ok` object, else the error's message. */
export function browserAnswer(stdout: string): { ok: Record<string, unknown> } | { error: string } | undefined {
  try {
    const v: unknown = JSON.parse(stdout)
    if (!isObj(v)) return undefined
    if (isObj(v['ok'])) return { ok: v['ok'] }
    const e = v['error']
    return isObj(e) && typeof e['message'] === 'string' ? { error: e['message'] } : undefined
  } catch {
    return undefined
  }
}
