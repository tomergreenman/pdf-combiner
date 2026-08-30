import { openPdf } from './pdfjs';
import { PageItem, SourceFile } from '../types';

export type PdfDoc = Awaited<ReturnType<typeof openPdf>>;

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  return { c, ctx };
}

/** Draw an image source onto a canvas whose longest edge is at most `maxPx`. */
export async function renderImageSource(
  source: SourceFile,
  maxPx: number,
  quality = 0.72,
): Promise<string> {
  const blob = new Blob([source.bytes.slice(0)], { type: source.mime });
  const bitmap = await createImageBitmap(blob);
  const target = Number.isFinite(maxPx) && maxPx > 0 ? maxPx : 1400;
  const scale = Math.min(1, target / Math.max(bitmap.width, bitmap.height, 1));
  const { c, ctx } = canvas2d(bitmap.width * scale, bitmap.height * scale);
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c.toDataURL('image/jpeg', quality);
}

/**
 * Render one page of an already-open PDF document to a data URL whose longest
 * edge is at most `maxPx`. Any rotation embedded in the source page is baked in
 * by pdf.js; user rotation is applied separately as a CSS transform.
 */
export async function renderPdfPageFromDoc(
  doc: PdfDoc,
  pageIndex: number,
  maxPx: number,
  quality = 0.72,
): Promise<string> {
  const page = await doc.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  const longest = Math.max(base.width, base.height) || 1;
  // Guard against a zero/NaN target (e.g. measured while the tab was hidden).
  const target = Number.isFinite(maxPx) && maxPx > 0 ? maxPx : 1400;
  const scale = Math.max(0.25, target / longest);
  const viewport = page.getViewport({ scale });
  const { c, ctx } = canvas2d(viewport.width, viewport.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return c.toDataURL('image/jpeg', quality);
}

/**
 * Render a single page at high resolution for the enlarged preview. Opens and
 * closes its own PDF document — used on demand, not in the thumbnail batch.
 */
export async function renderPagePreview(
  page: PageItem,
  source: SourceFile,
  maxPx: number,
): Promise<string> {
  if (page.kind === 'image') return renderImageSource(source, maxPx, 0.92);
  const doc = await openPdf(source.bytes);
  try {
    return await renderPdfPageFromDoc(doc, page.pdfPageIndex ?? 0, maxPx, 0.92);
  } finally {
    await doc.destroy();
  }
}
