import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { TripLogEntry } from './tripLog';

export type ExportFormat = 'pdf' | 'csv' | 'txt';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function buildFilename(ext: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  return `TripLog_${stamp}.${ext}`;
}

async function shareFile(uri: string, mimeType: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType });
  }
}

function writeToCache(filename: string, contents: string): string {
  const file = new File(Paths.cache, filename);
  file.write(contents);
  return file.uri;
}

function pctLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function exportAsCsv(entries: TripLogEntry[]): string {
  const lines = [
    'timestamp,sign_name,confidence',
    ...entries.map((e) => `${new Date(e.timestamp).toISOString()},${e.name.replace(/,/g, ' ')},${pctLabel(e.confidence)}`),
  ];
  return writeToCache(buildFilename('csv'), lines.join('\n'));
}

function exportAsTxt(entries: TripLogEntry[]): string {
  const now = new Date();
  const lines = [
    'TRAFFIC SIGN RECOGNITION — TRIP LOG',
    `Generated: ${now.toLocaleString()}`,
    `Total detections: ${entries.length}`,
    '',
    '-'.repeat(40),
    '',
    ...entries.map(
      (e, i) => `${i + 1}. ${new Date(e.timestamp).toLocaleString()} — ${e.name} (${pctLabel(e.confidence)})`
    ),
  ];
  return writeToCache(buildFilename('txt'), lines.join('\n'));
}

async function exportAsPdf(entries: TripLogEntry[]): Promise<string> {
  const now = new Date();
  const rows = entries
    .map(
      (e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${new Date(e.timestamp).toLocaleString()}</td>
          <td>${e.name}</td>
          <td>${pctLabel(e.confidence)}</td>
        </tr>`
    )
    .join('');
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #1C1C1E; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #8E8E93; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E5E5EA; font-size: 13px; }
          th { color: #8E8E93; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
        </style>
      </head>
      <body>
        <h1>Trip Log</h1>
        <div class="meta">Generated ${now.toLocaleString()} · ${entries.length} detection${entries.length !== 1 ? 's' : ''}</div>
        <table>
          <thead><tr><th>#</th><th>Time</th><th>Sign</th><th>Confidence</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No detections recorded.</td></tr>'}</tbody>
        </table>
      </body>
    </html>`;
  const { uri } = await Print.printToFileAsync({ html });
  const dest = new File(Paths.cache, buildFilename('pdf'));
  new File(uri).copy(dest);
  return dest.uri;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
};

export async function exportTripLog(entries: TripLogEntry[], format: ExportFormat): Promise<void> {
  const uri = format === 'pdf' ? await exportAsPdf(entries) : format === 'csv' ? exportAsCsv(entries) : exportAsTxt(entries);
  await shareFile(uri, MIME_TYPES[format]);
}