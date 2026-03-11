/**
 * Lazy-loaded export libraries (jsPDF, jspdf-autotable, xlsx).
 *
 * These libraries are heavy (~500KB combined) and should NOT be imported
 * at module load time. Instead, they are dynamically imported on first use
 * (when the user clicks an export button).
 *
 * Usage:
 *   const { jsPDF, autoTable } = await loadPDFLibs();
 *   const XLSX = await loadXLSXLib();
 */

// Cached modules — loaded once, reused forever
let pdfCache: { jsPDF: typeof import('jspdf')['default']; autoTable: typeof import('jspdf-autotable')['default'] } | null = null;
let xlsxCache: typeof import('xlsx') | null = null;

/**
 * Dynamically loads jsPDF + jspdf-autotable (for PDF export).
 * Returns cached instances after first load.
 */
export async function loadPDFLibs() {
  if (!pdfCache) {
    const [jsPDFModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    pdfCache = {
      jsPDF: jsPDFModule.default,
      autoTable: autoTableModule.default,
    };
  }
  return pdfCache;
}

/**
 * Dynamically loads xlsx (for Excel export).
 * Returns cached instance after first load.
 */
export async function loadXLSXLib() {
  if (!xlsxCache) {
    xlsxCache = await import('xlsx');
  }
  return xlsxCache;
}
