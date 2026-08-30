import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to a hashed URL served from our own origin (no CDN).
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export { pdfjsLib };

/**
 * Open a PDF from bytes. Pass a copy of the ArrayBuffer if the original is
 * needed elsewhere — pdf.js transfers/detaches the buffer it is given.
 */
export function openPdf(bytes: ArrayBuffer) {
  return pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
}
