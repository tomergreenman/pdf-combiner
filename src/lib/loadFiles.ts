import { openPdf } from './pdfjs';
import { normalizeQuarter } from './rotation';
import { ACCEPTED_MIME, PageItem, SourceFile } from '../types';

export interface LoadResult {
  sources: SourceFile[];
  pages: PageItem[];
  skipped: string[];
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function classify(file: File): 'pdf' | 'image' | null {
  const mime = file.type.toLowerCase();
  if (mime === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name)) return 'image';
  return null;
}

/**
 * Turn a batch of dropped/picked/captured files into a flat list of page
 * objects. A multi-page PDF becomes N pages; each image becomes 1 page.
 */
export async function loadFiles(files: File[]): Promise<LoadResult> {
  const sources: SourceFile[] = [];
  const pages: PageItem[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const kind = classify(file);
    if (!kind) {
      skipped.push(file.name);
      continue;
    }

    const bytes = await file.arrayBuffer();
    const mime =
      file.type ||
      (kind === 'pdf'
        ? 'application/pdf'
        : /\.png$/i.test(file.name)
          ? 'image/png'
          : /\.webp$/i.test(file.name)
            ? 'image/webp'
            : 'image/jpeg');

    if (kind === 'image' && !ACCEPTED_MIME.includes(mime)) {
      skipped.push(file.name);
      continue;
    }

    const source: SourceFile = { id: uid(), name: file.name, kind, bytes, mime };

    if (kind === 'image') {
      sources.push(source);
      pages.push({
        id: uid(),
        sourceId: source.id,
        sourceName: source.name,
        kind: 'image',
        embeddedRotation: 0,
        userRotation: 0,
        thumbnailPending: true,
      });
      continue;
    }

    // PDF: read page count + per-page embedded rotation.
    try {
      const doc = await openPdf(bytes);
      sources.push(source);
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        pages.push({
          id: uid(),
          sourceId: source.id,
          sourceName: source.name,
          kind: 'pdf-page',
          pdfPageIndex: i - 1,
          embeddedRotation: normalizeQuarter(page.rotate || 0),
          userRotation: 0,
          thumbnailPending: true,
        });
      }
      await doc.destroy();
    } catch (err) {
      console.error('Failed to parse PDF', file.name, err);
      skipped.push(file.name);
    }
  }

  return { sources, pages, skipped };
}
