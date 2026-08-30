export type SourceKind = 'pdf' | 'image';

export interface SourceFile {
  id: string;
  name: string;
  kind: SourceKind;
  /** Original file bytes, kept once and reused by pdf.js and pdf-lib. */
  bytes: ArrayBuffer;
  /** MIME type, used to pick the right pdf-lib embed path for images. */
  mime: string;
}

export type PageKind = 'pdf-page' | 'image';

export interface PageItem {
  /** Stable id for drag-and-drop and React keys. */
  id: string;
  sourceId: string;
  sourceName: string;
  kind: PageKind;
  /** 0-based page index within the source PDF (only for kind 'pdf-page'). */
  pdfPageIndex?: number;
  /** Rotation already embedded in the source PDF page, in degrees (0 for images). */
  embeddedRotation: number;
  /** User-applied rotation added on export: 0 | 90 | 180 | 270. */
  userRotation: number;
  /** Rendered thumbnail data URL, filled in asynchronously after load. */
  thumbnail?: string;
  /** True while the thumbnail is still rendering. */
  thumbnailPending: boolean;
}

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ACCEPT_ATTR = ACCEPTED_MIME.join(',');
