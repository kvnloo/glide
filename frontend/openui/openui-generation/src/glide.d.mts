export type GlidePart =
  | { readonly c: 'Row'; readonly parts: readonly GlidePart[] }
  | { readonly c: 'Section'; readonly slot: string; readonly parts: readonly GlidePart[] }
  | { readonly c: string; readonly slot: string };
export interface GlideView { readonly kind: 'glide-card'; readonly snapshotId: string; readonly parts: readonly GlidePart[] }
export interface GlideSelection {
  readonly schema: 'native-visual-selection/v1';
  readonly status: 'validated-not-verified';
  readonly scope: string;
  readonly id: string;
  readonly sourceHash: string;
  readonly libraryHash: string;
  readonly view: GlideView;
}
export const GLIDE_LIBRARY_HASH: string;
/** Fills a validated selection from the host document; throws (code slot/snapshot) when they disagree. */
export function bindGlide(view: GlideView, doc: unknown): unknown;
