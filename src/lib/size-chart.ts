/**
 * The per-product size chart (migration 023).
 *
 * One optional jsonb column, `products.size_chart`, shared by the admin form,
 * the product detail page and the Quick View so the three can never disagree
 * about what a valid chart looks like.
 *
 * Shape:
 *   {
 *     title: "Waistcoat",
 *     columns: ["XS", "S", "M", "L", "XL", "XXL"],
 *     rows: [{ label: "Chest", values: ["47", "49.5", "52.1", ...] }],
 *     notes: "plain text, one note per line"
 *   }
 *
 * Every measurement is stored in INCHES only. The customer-side modal converts
 * to centimetres for display with {@link convertMeasurement}; nothing else in
 * the app does unit arithmetic.
 *
 * Deliberately free of server-only imports: the admin form, the customer modal
 * and the server loaders all import this file.
 */

export type SizeChartRow = {
  /** Measurement name, e.g. "Chest". */
  label: string;
  /** One value per column, index-aligned with {@link SizeChart.columns}. */
  values: string[];
};

export type SizeChart = {
  title: string;
  columns: string[];
  rows: SizeChartRow[];
  /** Plain text, one note per line. */
  notes: string;
};

/** The unit toggle in the customer modal. */
export type SizeChartUnit = "in" | "cm";

export const INCH_TO_CM = 2.54;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Turns whatever the database or a form sent into a trustworthy chart, or null
 * when there is nothing to show.
 *
 * Everything is trimmed, empty columns are dropped, every row is padded or cut
 * to the column count (so `values[i]` always belongs to `columns[i]`), and a
 * chart with no columns or no labelled rows is null — the same rule the admin
 * action applies when it saves.
 *
 * Never throws: a malformed jsonb value (an object from an older manual edit,
 * a hand-edited payload) reads as "no size chart" instead of breaking the
 * product page.
 */
export function normalizeSizeChart(value: unknown): SizeChart | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as {
    title?: unknown;
    columns?: unknown;
    rows?: unknown;
    notes?: unknown;
  };

  const title = asString(raw.title);

  // Keep each surviving column's original index, so a blank column is dropped
  // together with its own values instead of shifting the next column's numbers
  // one cell to the left.
  const columnEntries: { name: string; sourceIndex: number }[] = [];

  if (Array.isArray(raw.columns)) {
    raw.columns.forEach((entry, sourceIndex) => {
      const name = asString(entry);
      if (!name) return;
      columnEntries.push({ name, sourceIndex });
    });
  }

  const columns = columnEntries.map((entry) => entry.name);

  const rows: SizeChartRow[] = Array.isArray(raw.rows)
    ? raw.rows.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return [];
        }

        const row = entry as { label?: unknown; values?: unknown };
        const label = asString(row.label);
        if (!label) return [];

        const rawValues = Array.isArray(row.values) ? row.values : [];
        const values = columnEntries.map((column) =>
          asString(rawValues[column.sourceIndex]),
        );

        return [{ label, values }];
      })
    : [];

  if (columns.length === 0 || rows.length === 0) return null;

  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";

  return { title, columns, rows, notes };
}

/**
 * A chart value in the chosen unit.
 *
 * INCHES returns the value as typed. CM multiplies by 2.54 and rounds to one
 * decimal (`47` -> `119.4`). A value that is not a plain number — "Free",
 * "47-49", an empty cell — is shown as typed in both units, so a chart can
 * carry a note instead of a measurement without the conversion mangling it.
 */
export function convertMeasurement(
  value: string,
  unit: SizeChartUnit,
): string {
  if (unit === "in") return value;

  const trimmed = value.trim();
  if (!trimmed) return "";

  const inches = Number(trimmed);
  if (!Number.isFinite(inches)) return trimmed;

  const centimetres = Math.round(inches * INCH_TO_CM * 10) / 10;
  return centimetres.toFixed(1);
}

/** The notes as the bullet list the customer reads. */
export function sizeChartNotes(chart: SizeChart): string[] {
  return chart.notes
    .split(/\r?\n/)
    .map((note) => note.trim())
    .filter((note) => note.length > 0);
}
