import * as z from 'zod/mini'

import type { EuiCardSpec } from './euiCard.js'

const kitDoc = z.object({
  kind: z.string().check(z.regex(/^[a-z][a-z0-9-]{0,39}$/)),
  app: z.string().check(z.regex(/^[a-z0-9][a-z0-9.-]{0,63}$/)),
  title: z.optional(z.string().check(z.maxLength(200))),
  data: z.record(z.string(), z.unknown())
})

/** Opaque kit input, not executable authority. The kit validates its own data schema. */
export interface EuiKitDoc extends EuiCardSpec {
  readonly data: Readonly<Record<string, unknown>>
}

function freeze(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
  for (const child of Object.values(value)) freeze(child)
  Object.freeze(value)
}

export function decodeEuiKit(raw: unknown): EuiKitDoc {
  const text = JSON.stringify(raw)
  if (!text || Buffer.byteLength(text) > 1024 * 1024) throw new TypeError('Invalid kit document size')
  const parsed = kitDoc.safeParse(JSON.parse(text))
  if (!parsed.success) throw new TypeError('Invalid kit document')
  const { title, ...fields } = parsed.data
  const doc = title === undefined ? fields : { ...fields, title }
  freeze(doc)
  return doc
}

/** Source diagnostics belong to the host wrapper, not the kit's strict fleet.v0 schema. */
export function kitNotes(doc: EuiKitDoc): readonly string[] {
  const notes = z.array(z.string()).safeParse(doc.data['notes'])
  const hosts = z.array(z.object({ label: z.string(), notes: z.optional(z.array(z.string())) })).safeParse(doc.data['hosts'])
  // intel-suite draws its own notes behind a collapsed "Source notes"; repeating them here was a wall of prose.
  // Hosts sharing a note name it once ("laptop, phone: …"), and a fleet card's notes share one line under it,
  // so the capped card keeps its head on screen instead of a paragraph per host pushing it up.
  const byNote = new Map<string, string[]>()
  for (const host of hosts.success ? hosts.data : []) for (const note of host.notes ?? []) byNote.set(note, [...(byNote.get(note) ?? []), host.label])
  const lines = [...(notes.success && doc.kind !== 'intel-suite' ? notes.data : []), ...[...byNote].map(([note, labels]) => `${labels.join(', ')}: ${note}`)]
  return doc.kind.startsWith('fleet-') ? [['Source: read-only fleet collectors', ...lines].join(' · ')] : lines
}

export function kitInput(doc: EuiKitDoc): EuiKitDoc {
  if (!doc.kind.startsWith('fleet-')) return doc
  const { notes: _notes, ...data } = doc.data
  const hosts = data['hosts']
  const cleanHosts = Array.isArray(hosts) ? hosts.map((host: unknown) => {
    if (!host || typeof host !== 'object' || Array.isArray(host)) return host
    const { notes: _notes, ...fields } = host as Record<string, unknown>
    return fields
  }) : undefined
  return decodeEuiKit({ ...doc, data: { ...data, ...(cleanHosts ? { hosts: cleanHosts } : {}) } })
}
