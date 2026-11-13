// The bound glide/v1 tree: what the renderer (render.tsx) draws. A program written against the
// model-facing catalog (openui/openui-generation/src/glide.mjs) only names host slots; bindGlide fills
// each one with these props from the host card document (GlideDoc). Nothing here is model-authored,
// and nothing mounts kit HTML: the ephemeral-ui kit is the visual reference only.

export type UiTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'error'
export type UiStatus = 'pending' | 'running' | 'done' | 'error'
/** A host action a control sends back to the card's owner. */
export type UiIntent = Readonly<{ action: string; entities?: Readonly<Record<string, string | number>> }>
/** A table cell: plain text, a 0..1 number (meter columns) or toned text. */
export type UiCell = string | number | Readonly<{ text: string; tone: UiTone }>

export interface UiParts {
  Card: { title: string; children: readonly UiNode[]; status?: UiStatus; app?: string; source?: string }
  Section: { title: string; children: readonly UiNode[]; aside?: string }
  Row: { children: readonly UiNode[] }
  Hero: { value: string; label: string; detail?: string; tone?: UiTone }
  Stats: { items: readonly { label: string; value: string; tone?: UiTone }[] }
  Text: { body: string; tone?: UiTone | 'muted' | 'strong' | 'quote' }
  Spark: { points: readonly number[]; summary: string }
  Bars: { values: readonly number[]; labels: readonly string[]; summary: string }
  Meter: { label: string; value: number; total?: string; tone?: UiTone }
  Table: {
    columns: readonly { id: string; head: string; align?: 'start' | 'end'; meter?: boolean; grow?: boolean }[]
    rows: readonly { id: string; cells: Readonly<Record<string, UiCell>>; intent?: UiIntent }[]
  }
  Kv: { items: readonly { k: string; v: string }[] }
  /** `group` starts a labelled run of rows (a host's agents, a repository's tasks) when it changes. */
  List: { items: readonly { id: string; label: string; detail?: string; value?: string; badge?: string; tone?: UiTone; intent?: UiIntent; group?: string }[]; numbered?: boolean }
  Tabs: { items: readonly { id: string; label: string; count?: number; intent: UiIntent }[]; active: string }
  Badges: { items: readonly { text: string; tone?: UiTone }[] }
  Steps: { items: readonly { id: string; text: string; status: 'pending' | 'active' | 'done' | 'blocked'; note?: string }[] }
  Flow: { stages: readonly { id: string; label: string; detail?: string; tone?: UiTone }[]; note?: string }
  Buttons: { items: readonly { label: string; intent: UiIntent; primary?: boolean; disabled?: boolean }[] }
  /** A trusted SVG the host drew (waveform, ring, day band). */
  Graphic: { svg: string; w: number; h: number; alt: string }
}
export type UiName = keyof UiParts
export type UiNode = { readonly [N in UiName]: { readonly type: 'element'; readonly typeName: N; readonly props: Readonly<UiParts[N]> } }[UiName]

type Leaf = Exclude<UiName, 'Card' | 'Row'>
type SlotProps<N extends Leaf> = N extends 'Section' ? Omit<UiParts['Section'], 'children'> : UiParts[N]
/** A slot's component and its props, as the host stores it in a GlideDoc (bindGlide checks the pairing). */
export interface GlideSlot<N extends Leaf = Leaf> { readonly c: N; readonly p: Readonly<SlotProps<N>> }

/** A host card document: the only data a glide/v1 program can show. */
export interface GlideDoc {
  readonly id: string
  readonly title: string
  readonly status?: UiStatus
  readonly source?: string
  readonly app?: string
  readonly slots: Readonly<Record<string, GlideSlot>>
}

/** Typed slot constructor: `slot('Hero', { value, label })`. */
export function slot<N extends Leaf>(c: N, p: SlotProps<N>): GlideSlot<N> {
  return { c, p }
}
