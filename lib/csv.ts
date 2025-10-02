export type CSVRecord = Record<string, string>;

export function stringifyCSV(headers: string[], rows: Array<Record<string, unknown>>): string {
  const escape = (value: unknown): string => {
    const s = value === undefined || value === null ? "" : String(value);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((row) => headers.map((h) => escape((row as Record<string, unknown>)[h])).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export function parseCSV(text: string): CSVRecord[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === ',') {
          result.push(current);
          current = "";
        } else if (char === '"') {
          inQuotes = true;
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const values = parseLine(l);
    const rec: CSVRecord = {};
    headers.forEach((h, idx) => {
      rec[h] = values[idx]?.trim?.() ?? "";
    });
    return rec;
  });
}

export function normalizeBoolean(input: string | boolean | undefined): boolean {
  if (typeof input === "boolean") return input;
  const s = (input ?? "").toString().trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}


