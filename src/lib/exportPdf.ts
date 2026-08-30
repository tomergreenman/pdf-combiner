import { degrees, PDFDocument } from 'pdf-lib';
import { PageItem, SourceFile } from '../types';
import { totalRotation } from './rotation';

export interface ExportProgress {
  done: number;
  total: number;
}

async function reencodeToPng(bytes: ArrayBuffer, mime: string): Promise<Uint8Array> {
  const blob = new Blob([bytes.slice(0)], { type: mime });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const outBlob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
  return new Uint8Array(await outBlob.arrayBuffer());
}

async function embedImage(out: PDFDocument, source: SourceFile) {
  const bytes = source.bytes;
  const mime = source.mime.toLowerCase();
  if (mime === 'image/jpeg') {
    try {
      return await out.embedJpg(new Uint8Array(bytes.slice(0)));
    } catch {
      return out.embedPng(await reencodeToPng(bytes, mime));
    }
  }
  if (mime === 'image/png') {
    try {
      return await out.embedPng(new Uint8Array(bytes.slice(0)));
    } catch {
      return out.embedPng(await reencodeToPng(bytes, mime));
    }
  }
  // webp / anything else: rasterize to PNG first.
  return out.embedPng(await reencodeToPng(bytes, mime || 'image/webp'));
}

/**
 * Build a merged PDF from the ordered page list and trigger a browser download.
 * Returns the output filename.
 */
export async function exportMergedPdf(
  pages: PageItem[],
  getSource: (id: string) => SourceFile | undefined,
  onProgress?: (p: ExportProgress) => void,
): Promise<string> {
  if (pages.length === 0) throw new Error('Nothing to export');

  const out = await PDFDocument.create();
  const srcDocs = new Map<string, PDFDocument>();

  const getSrcDoc = async (sourceId: string): Promise<PDFDocument> => {
    let doc = srcDocs.get(sourceId);
    if (!doc) {
      const src = getSource(sourceId);
      if (!src) throw new Error('Missing source file');
      doc = await PDFDocument.load(src.bytes.slice(0));
      srcDocs.set(sourceId, doc);
    }
    return doc;
  };

  let done = 0;
  for (const item of pages) {
    if (item.kind === 'pdf-page') {
      const srcDoc = await getSrcDoc(item.sourceId);
      const [copied] = await out.copyPages(srcDoc, [item.pdfPageIndex ?? 0]);
      copied.setRotation(
        degrees(totalRotation(item.embeddedRotation, item.userRotation)),
      );
      out.addPage(copied);
    } else {
      const source = getSource(item.sourceId);
      if (!source) throw new Error('Missing source file');
      const img = await embedImage(out, source);
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      page.setRotation(degrees(totalRotation(0, item.userRotation)));
    }

    done += 1;
    onProgress?.({ done, total: pages.length });
    if (done % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  const bytes = await out.save();
  const blob = new Blob([bytes.slice(0)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, '-')
    .replace(/\..+/, '');
  const filename = `merged-${stamp}.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return filename;
}
