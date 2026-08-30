import { openPdf } from './pdfjs';
import { PageItem, SourceFile } from '../types';
import { PdfDoc, renderImageSource, renderPdfPageFromDoc } from './renderPage';

const THUMB_MAX = 340; // longest edge, in px

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
          onThumb(item.id, await renderImageSource(source, THUMB_MAX));
        } else {
          let doc = pdfDocs.get(source.id);
          if (!doc) {
            doc = await openPdf(source.bytes);
            pdfDocs.set(source.id, doc);
          }
          onThumb(item.id, await renderPdfPageFromDoc(doc, item.pdfPageIndex ?? 0, THUMB_MAX));
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
