"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon, RulerIcon } from "@/components/icons";
import { modalBackdropVariant, modalVariant } from "@/lib/motion";
import {
  convertMeasurement,
  sizeChartNotes,
  type SizeChart,
  type SizeChartUnit,
} from "@/lib/size-chart";
import { cn } from "@/lib/utils";

type SizeChartModalProps = {
  productName: string;
  chart: SizeChart;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * The customer-facing size chart (migration 023).
 *
 * Rendered through `next/dynamic` from `ProductDetailContent`, which serves
 * both the product detail page and the Quick View. It is portalled to
 * `document.body` so the Quick View's scroll container and animated panel
 * cannot clip it or capture its fixed positioning, and it sits at `z-60` —
 * above the Quick View's `z-50`.
 *
 * "Closing only the top modal": the Quick View listens for Escape on
 * `document` in the bubble phase. This modal listens in the **capture** phase
 * and stops the event there, so an Escape press closes the size chart and
 * leaves the Quick View open underneath.
 */
export default function SizeChartModal({
  productName,
  chart,
  isOpen,
  onClose,
}: SizeChartModalProps) {
  const [unit, setUnit] = useState<SizeChartUnit>("in");
  const [wasOpen, setWasOpen] = useState(isOpen);

  /*
   * Every opening starts on INCHES, the unit the admin typed. Adjusting state
   * while rendering (React's documented "reset state when a prop changes"
   * pattern) resets it in the same paint as the opening, without an effect and
   * without a cascading render.
   */
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setUnit("in");
  }

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // Keep the Quick View's own Escape handler from closing underneath us.
      event.stopPropagation();
      onClose();
    };

    // Capture phase: this runs before the Quick View's document listener.
    document.addEventListener("keydown", handleKeyDown, true);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  const notes = sizeChartNotes(chart);

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="size-chart"
          variants={modalBackdropVariant}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            variants={modalVariant}
            initial="hidden"
            animate="show"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-chart-title"
            tabIndex={-1}
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-y-auto bg-white p-5 text-black sm:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close size chart"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-black transition-colors hover:text-plum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum sm:right-4 sm:top-4"
            >
              <CloseIcon width={18} height={18} />
            </button>

            <div className="pr-12">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-black/50">
                <RulerIcon width={14} height={14} />
                Size Charts
              </p>
              <h2
                id="size-chart-title"
                className="mt-2 break-words text-xl leading-tight sm:text-2xl [overflow-wrap:anywhere]"
              >
                {productName}
              </h2>
              {chart.title ? (
                <p className="mt-1 text-sm text-black/60">{chart.title}</p>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                Measurements
              </span>

              <div
                role="group"
                aria-label="Measurement unit"
                className="flex border border-black/15"
              >
                {(
                  [
                    { value: "cm", label: "CM" },
                    { value: "in", label: "INCHES" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={unit === option.value}
                    onClick={() => setUnit(option.value)}
                    className={cn(
                      "min-h-9 px-3 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum",
                      unit === option.value
                        ? "bg-plum text-white"
                        : "bg-white text-black/60 hover:text-plum",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/*
             * The table keeps the measurement column stuck to the left while
             * the size columns scroll sideways on a phone, so the row always
             * says what is being measured.
             */}
            <div className="mt-3 overflow-x-auto border border-black/10 [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr className="bg-black/[0.03]">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 min-w-[112px] border-b border-r border-black/10 bg-[#f9f9f9] px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-black/50"
                    >
                      Measurement
                    </th>
                    {chart.columns.map((column, columnIndex) => (
                      <th
                        key={columnIndex}
                        scope="col"
                        className="min-w-[64px] border-b border-black/10 px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-black"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {chart.rows.map((row, rowIndex) => (
                    <tr key={`${row.label}-${rowIndex}`}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-r border-black/10 bg-white px-3 py-2.5 text-left text-xs font-medium text-black"
                      >
                        {row.label}
                      </th>
                      {chart.columns.map((column, index) => (
                        <td
                          key={`${rowIndex}-${index}`}
                          className="border-b border-black/10 px-3 py-2.5 text-center text-sm tabular-nums text-black/80"
                        >
                          {convertMeasurement(row.values[index] ?? "", unit)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-[11px] text-black/40">
              {unit === "in"
                ? "All measurements in inches."
                : "Centimetres are calculated from inches (1 in = 2.54 cm)."}
            </p>

            {notes.length > 0 ? (
              <ul className="mt-4 flex list-disc flex-col gap-1.5 pl-5 text-xs leading-relaxed text-black/60">
                {notes.map((note, index) => (
                  <li key={`${note}-${index}`}>{note}</li>
                ))}
              </ul>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
