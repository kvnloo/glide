// #99: TSP control frames and bracketed paste share one pty input stream. The pinned SDK
// InputParser passes every byte between paste delimiters through as literal paste, and the
// public protocol has no in-paste escape for control frames. A host must therefore
// serialize its writes: never place an ack/event between paste delimiters. These
// deterministic checks pin that boundary so an SDK or host change is noticed.
// Real Tern host write ordering is NOT exercised here.
import { InputParser, KeyDecoder, type Key, type TspEvent } from '@stencil-hq/tern'
import { describe, expect, it } from 'vitest'

import { Composer } from '../draft/composer.js'

const bytes = (text: string) => new TextEncoder().encode(text)
const ack = (s: number) => `\u001b_tsp;e;${JSON.stringify({ ev: 'ack', sf: 's1', s })}\u001b\\`
const START = '\u001b[200~'
const END = '\u001b[201~'
// Literal text containing escape-looking sequences is still user data.
const LITERAL = 'red \u001b[31mtext\u001b[0m and \u001b_not-tsp\u001b\\ 🧩 😀'

/** Feeds raw pty chunks through the pinned SDK parser and key decoder, as Session does. */
function drive(chunks: readonly (string | Uint8Array)[]) {
  const parser = new InputParser()
  const decoder = new KeyDecoder()
  const keys: Key[] = []
  const events: TspEvent[] = []
  for (const chunk of chunks) {
    for (const item of parser.feed(typeof chunk === 'string' ? bytes(chunk) : chunk)) {
      if (item.type === 'keys') keys.push(...decoder.feed(item.bytes))
      else if (item.type === 'event') events.push(item.event)
    }
  }
  for (const item of parser.flush()) {
    if (item.type === 'keys') keys.push(...decoder.feed(item.bytes))
  }
  return { keys, events, pending: parser.pending || decoder.pending }
}

const pastes = (keys: readonly Key[]) => keys.filter(k => k.name === 'paste').map(k => k.text)
const acks = (events: readonly TspEvent[]) => events.flatMap(e => e.ev === 'ack' ? [e.s] : [])

/** Splits `text` at every byte offset in `cuts`. */
function split(text: string, cuts: readonly number[]): Uint8Array[] {
  const all = bytes(text)
  const points = [0, ...cuts, all.length]
  return points.slice(1).map((end, i) => all.slice(points[i], end))
}

describe('TSP ack ordering around bracketed paste (#99)', () => {
  it('serialized host writes keep the paste literal and deliver acks before and after it', () => {
    const { keys, events, pending } = drive([ack(1), START, LITERAL, END, ack(2)])
    expect(pastes(keys)).toEqual([LITERAL])
    expect(acks(events)).toEqual([1, 2])
    expect(pending).toBe(false)
  })

  it('serialized writes survive every split of delimiters, multibyte text and ack frames', () => {
    const stream = `${ack(1)}${START}${LITERAL}${END}${ack(2)}`
    const total = bytes(stream).length
    for (let cut = 1; cut < total; cut++) {
      const { keys, events } = drive(split(stream, [cut]))
      expect(pastes(keys), `cut ${cut}`).toEqual([LITERAL])
      expect(acks(events), `cut ${cut}`).toEqual([1, 2])
    }
    const bytewise = drive(split(stream, Array.from({ length: total - 1 }, (_, i) => i + 1)))
    expect(pastes(bytewise.keys)).toEqual([LITERAL])
    expect(acks(bytewise.events)).toEqual([1, 2])
  })

  it('an ack completed before a paste starts is delivered once, even when it straddles chunks', () => {
    const frame = ack(7)
    const { keys, events } = drive([frame.slice(0, 9), frame.slice(9) + START + 'ab', `cd${END}`])
    expect(acks(events)).toEqual([7])
    expect(pastes(keys)).toEqual(['abcd'])
  })

  it('documents the current SDK: an ack written inside a paste is literal paste text, not an ack', () => {
    for (const chunks of [
      [START, 'ab', ack(3), `cd${END}`],
      [`${START}ab${ack(3)}cd${END}`],
      [START, 'ab', ack(3).slice(0, 5), ack(3).slice(5), 'cd', END.slice(0, 3), END.slice(3)]
    ]) {
      const { keys, events } = drive(chunks)
      expect(acks(events)).toEqual([])
      expect(pastes(keys)).toEqual([`ab${ack(3)}cd`])
    }
  })

  it('an unterminated paste withholds a following ack as pending paste data', () => {
    const { keys, events, pending } = drive([START, 'ab', ack(4)])
    expect(acks(events)).toEqual([])
    expect(pastes(keys)).toEqual([])
    expect(pending).toBe(true)
  })

  it('the composer keeps interleaved bytes verbatim with literal provenance, never stripping user text', () => {
    const composer = new Composer()
    for (const key of drive([START, 'ab', ack(5), `cd${END}`]).keys) composer.key(key)
    expect(composer.text).toBe(`ab${ack(5)}cd`)
    expect(composer.literal).toBe(true)
    expect(composer.shellPasted).toEqual([`ab${ack(5)}cd`])

    const serialized = new Composer()
    for (const key of drive([START, LITERAL, END, ack(6)]).keys) serialized.key(key)
    expect(serialized.text).toBe(LITERAL)
    expect(serialized.literal).toBe(true)
    expect(serialized.shellPasted).toEqual([LITERAL])
  })
})
