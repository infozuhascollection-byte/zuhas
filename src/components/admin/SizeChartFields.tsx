"use client";

import {
  ADMIN_INPUT_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
} from "@/components/admin/admin-fields";
import {
  MAX_SIZE_CHART_COLUMNS,
  MAX_SIZE_CHART_LABEL_LENGTH,
  MAX_SIZE_CHART_NOTES_LENGTH,
  MAX_SIZE_CHART_ROWS,
  MAX_SIZE_CHART_TITLE_LENGTH,
  MAX_SIZE_CHART_VALUE_LENGTH,
} from "@/lib/admin/validation";
import type { SizeChart } from "@/lib/size-chart";
import { cn } from "@/lib/utils";

/**
 * The product form's optional "Size Chart" section (migration 023).
 *
 * Purely the editor: the shape it builds is converted by {@link toSizeChartDraft}
 * / {@link fromSizeChartDraft} and re-validated by `readSizeChart` in the
 * server action, so nothing typed here is trusted on save. Values stay
 * index-aligned with the columns even while a column is added, renamed or
 * removed, which is what keeps "Chest → 47" on the right size.
 */

export type SizeChartDraft = {
  title: string;
  columns: string[];
  rows: { label: string; values: string[] }[];
  notes: string;
};

export function emptySizeChartDraft(): SizeChartDraft {
  return { title: "", columns: [], rows: [], notes: "" };
}

/** The saved chart as the form's editable draft. */
export function toSizeChartDraft(chart: SizeChart | null): SizeChartDraft {
  if (!chart) return emptySizeChartDraft();

  return {
    title: chart.title,
    columns: [...chart.columns],
    rows: chart.rows.map((row) => ({
      label: row.label,
      values: [...row.values],
    })),
    notes: chart.notes,
  };
}

/**
 * The draft as it is sent to the server. Empty columns are left for the server
 * to drop (with their values); a chart with no columns or no named rows is
 * `null`, i.e. "this product has no size chart".
 */
export function fromSizeChartDraft(draft: SizeChartDraft): SizeChart | null {
  const columns = draft.columns.map((column) => column.trim());
  const rows = draft.rows.flatMap((row) => {
    const label = row.label.trim();
    if (!label) return [];

    return [
      {
        label,
        values: columns.map((_, index) => (row.values[index] ?? "").trim()),
      },
    ];
  });

  if (columns.every((column) => !column) || rows.length === 0) return null;

  return {
    title: draft.title.trim(),
    columns,
    rows,
    notes: draft.notes.trim(),
  };
}

export default function SizeChartFields({
  value,
  onChange,
}: {
  value: SizeChartDraft;
  onChange: (next: SizeChartDraft) => void;
}) {
  const setTitle = (title: string) => onChange({ ...value, title });

  const addColumn = () => {
    if (value.columns.length >= MAX_SIZE_CHART_COLUMNS) return;

    onChange({
      ...value,
      columns: [...value.columns, ""],
      rows: value.rows.map((row) => ({
        ...row,
        values: [...row.values, ""],
      })),
    });
  };

  const setColumn = (index: number, name: string) => {
    onChange({
      ...value,
      columns: value.columns.map((column, columnIndex) =>
        columnIndex === index ? name : column,
      ),
    });
  };

  const removeColumn = (index: number) => {
    onChange({
      ...value,
      columns: value.columns.filter((_, columnIndex) => columnIndex !== index),
      rows: value.rows.map((row) => ({
        ...row,
        values: row.values.filter((_, columnIndex) => columnIndex !== index),
      })),
    });
  };

  const addRow = () => {
    if (value.columns.length === 0) return;
    if (value.rows.length >= MAX_SIZE_CHART_ROWS) return;

    onChange({
      ...value,
      rows: [
        ...value.rows,
        {
          label: "",
          values: value.columns.map(() => ""),
        },
      ],
    });
  };

  const setRowLabel = (index: number, label: string) => {
    onChange({
      ...value,
      rows: value.rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, label } : row,
      ),
    });
  };

  const setRowValue = (
    rowIndex: number,
    columnIndex: number,
    cell: string,
  ) => {
    onChange({
      ...value,
      rows: value.rows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              values: row.values.map((cellValue, indexToUpdate) =>
                indexToUpdate === columnIndex ? cell : cellValue,
              ),
            }
          : row,
      ),
    });
  };

  const removeRow = (index: number) => {
    onChange({
      ...value,
      rows: value.rows.filter((_, rowIndex) => rowIndex !== index),
    });
  };

  return (
    <section className="flex flex-col gap-4 border-t border-black/10 pt-5">
      <div>
        <h2 className="text-sm font-medium tracking-[0.12em] uppercase">
          Size Chart
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-black/50">
          Optional. Enter all measurements in inches. CM is calculated
          automatically. Leave it empty to hide the Size Chart link on the
          product page.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-[0.08em] uppercase">
          Chart title
        </span>
        <input
          value={value.title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_SIZE_CHART_TITLE_LENGTH}
          className={ADMIN_INPUT_CLASS}
          placeholder="Waistcoat"
        />
      </label>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-[0.08em] uppercase">
            Columns
          </span>
          <button
            type="button"
            onClick={addColumn}
            disabled={value.columns.length >= MAX_SIZE_CHART_COLUMNS}
            className={cn(ADMIN_SECONDARY_BUTTON_CLASS, "min-h-0 py-1.5")}
          >
            Add column
          </button>
        </div>

        {value.columns.length === 0 ? (
          <p className="mt-2 border border-dashed border-black/15 px-3 py-4 text-center text-xs text-black/45">
            Add a column for each size, e.g. XS, S, M, L.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.columns.map((column, index) => (
              <div key={index} className="flex items-center gap-1">
                <input
                  value={column}
                  onChange={(event) => setColumn(index, event.target.value)}
                  maxLength={MAX_SIZE_CHART_LABEL_LENGTH}
                  className={cn(ADMIN_INPUT_CLASS, "w-24")}
                  placeholder="S"
                  aria-label={`Column ${index + 1} name`}
                />
                <button
                  type="button"
                  onClick={() => removeColumn(index)}
                  aria-label={`Remove column ${index + 1}`}
                  className="flex h-9 w-9 items-center justify-center border border-black/15 text-sm text-black/55 transition-colors hover:border-black/40 hover:text-black"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-1 text-[11px] text-black/40">
          {value.columns.length}/{MAX_SIZE_CHART_COLUMNS} columns.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-[0.08em] uppercase">
            Rows
          </span>
          <button
            type="button"
            onClick={addRow}
            disabled={
              value.columns.length === 0 ||
              value.rows.length >= MAX_SIZE_CHART_ROWS
            }
            className={cn(ADMIN_SECONDARY_BUTTON_CLASS, "min-h-0 py-1.5")}
          >
            Add row
          </button>
        </div>

        {value.rows.length === 0 ? (
          <p className="mt-2 border border-dashed border-black/15 px-3 py-4 text-center text-xs text-black/45">
            {value.columns.length === 0
              ? "Add at least one column first."
              : "Add a row for each measurement, e.g. Chest, Length."}
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {value.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="border border-black/10 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={row.label}
                    onChange={(event) =>
                      setRowLabel(rowIndex, event.target.value)
                    }
                    maxLength={MAX_SIZE_CHART_LABEL_LENGTH}
                    className={cn(ADMIN_INPUT_CLASS, "flex-1")}
                    placeholder="Chest"
                    aria-label={`Row ${rowIndex + 1} measurement name`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    aria-label={`Remove row ${rowIndex + 1}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center border border-black/15 text-sm text-black/55 transition-colors hover:border-black/40 hover:text-black"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {value.columns.map((column, columnIndex) => (
                    <label
                      key={columnIndex}
                      className="flex flex-col gap-1 text-[10px] tracking-[0.1em] text-black/45 uppercase"
                    >
                      {column.trim() || `Column ${columnIndex + 1}`}
                      <input
                        value={row.values[columnIndex] ?? ""}
                        onChange={(event) =>
                          setRowValue(
                            rowIndex,
                            columnIndex,
                            event.target.value,
                          )
                        }
                        maxLength={MAX_SIZE_CHART_VALUE_LENGTH}
                        className={cn(ADMIN_INPUT_CLASS, "w-20")}
                        placeholder="47"
                        inputMode="decimal"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-1 text-[11px] text-black/40">
          {value.rows.length}/{MAX_SIZE_CHART_ROWS} rows. Values are inches.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-[0.08em] uppercase">
          Notes
        </span>
        <textarea
          value={value.notes}
          onChange={(event) =>
            onChange({ ...value, notes: event.target.value })
          }
          maxLength={MAX_SIZE_CHART_NOTES_LENGTH}
          rows={3}
          className={ADMIN_INPUT_CLASS}
          placeholder={"One note per line, e.g.\nMeasurements are approximate."}
        />
        <span className="text-[11px] text-black/40">
          One note per line, shown as a bullet list under the table.
        </span>
      </label>
    </section>
  );
}
