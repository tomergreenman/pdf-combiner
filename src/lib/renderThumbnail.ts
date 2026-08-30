import { openPdf } from './pdfjs';
import { PageItem, SourceFile } from '../types';

const THUMB_MAX = 340; // longest edge, in px, before device pixel ratio

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  return { c, ctx };
}

async function renderImageThumb(source: SourceFile): Promise<string> {
  const blob = new Blob([source.bytes.slice(0)], { type: source.mime });
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, THUMB_MAX / Math.max(bitmap.width, bitmap.height));
  const { c, ctx } = canvas2d(bitmap.width * scale, bitmap.height * scale);
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c.toDataURL('image/jpeg', 0.72);
}

type PdfDoc = Awaited<ReturnType<typeof openPdf>>;

async function renderPdfPageThumb(doc: PdfDoc, pageIndex: number): Promise<string> {
  const page = await doc.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  const scale = THUMB_MAX / Math.max(base.width, base.height);
  const viewport = page.getViewport({ scale });
  const { c, ctx } = canvas2d(viewport.width, viewport.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return c.toDataURL('image/jpeg', 0.72);
}

/**
 * Render thumbnails for the given pages, calling `onThumb` as each one finishes.
 * Source PDFs are opened once and reused across all their pages.
 */
export async function renderThumbnails(
  pages: PageItem[],
  getSource: (id: string) => SourceFile | undefined,
  onThumb: (pageId: string, dataUrl: string) => void,
  isStale?: (pageId: string) => boolean,
): Promise<void> {
  const pdfDocs = new Map<string, PdfDoc>();

  try {
    for (const item of pages) {
      if (isStale?.(item.id)) continue;
      const source = getSource(item.sourceId);
      if (!source) continue;

      try {
        if (item.kind === 'image') {
          onThumb(item.id, await renderImageThumb(source));
        } else {
          let doc = pdfDocs.get(source.id);
          if (!doc) {
            doc = await openPdf(source.bytes);
            pdfDocs.set(source.id, doc);
          }
          onThumb(item.id, await renderPdfPageThumb(doc, item.pdfPageIndex ?? 0));
        }
      } catch (err) {
        console.error('Thumbnail render failed for', item.sourceName, err);
        onThumb(item.id, ''); // clears the pending state; card shows a placeholder
      }

      // Yield so the UI stays responsive on large batches.
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    for (const doc of pdfDocs.values()) await doc.destroy();
  }
}
