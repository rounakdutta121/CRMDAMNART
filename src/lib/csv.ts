import { MAX_CSV_FILE_BYTES, MAX_CSV_ROWS } from "@/lib/constants";

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  if (text.length > MAX_CSV_FILE_BYTES) {
    throw new Error("CSV file exceeds the maximum allowed size.");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      if (char === "\r") {
        i += 1;
      }
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headers, ...dataRows] = rows;
  if (dataRows.length > MAX_CSV_ROWS) {
    throw new Error(`CSV exceeds the maximum of ${MAX_CSV_ROWS} rows.`);
  }

  return { headers, rows: dataRows };
}

function protectCsvFormulaInjection(text: string): string {
  if (/^[=+\-@\t\r]/.test(text)) {
    return `'${text}`;
  }
  return text;
}

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = protectCsvFormulaInjection(String(value));
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers.map((_, index) => escapeCsvValue(row[index] ?? "")).join(",")
    ),
  ];
  return lines.join("\n");
}
