/**
 * TicketSummaryCard — inline decision card shown when AI has collected enough detail.
 *
 * Rules:
 *  - Inline in the chat flow, NOT a modal/popup.
 *  - Calm, trustworthy paper aesthetic — NO confetti, NO bounce motion.
 *  - Displays generated issue summary + automatically attached student identity.
 *  - Two actions: "Looks right, submit" (primary Moss button) and "Let me add more" (secondary).
 *
 * Props:
 *  - summary     (object)   { title, category, description, referenceId, student }
 *  - onSubmit    (fn)       Called when student approves ticket submission
 *  - onAddMore   (fn)       Called when student wants to clarify further
 *  - isSubmitting (bool)
 *  - isSubmitted  (bool)
 */
export default function TicketSummaryCard({
  summary,
  onSubmit,
  onAddMore,
  isSubmitting = false,
  isSubmitted = false,
}) {
  const { title, category, description, referenceId, student } = summary;

  return (
    <div className="my-3 opacity-0 animate-[message-enter_150ms_ease-out_forwards]">
      <div className="relative rounded-sm border border-clay bg-bone p-4 sm:p-5">
        {/* Marigold paper corner accent — design.md §3 */}
        <div
          className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-br-md bg-marigold select-none"
          aria-hidden="true"
        />

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-clay/60 pb-2.5">
          <div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-ink/50 select-none">
              Generated Issue Summary
            </span>
            <h4 className="font-heading text-sm font-bold text-ink mt-0.5">
              {title}
            </h4>
          </div>

          <span className="rounded-sm border border-clay bg-clay/20 px-2 py-0.5 font-sans text-[11px] text-ink/70">
            {category}
          </span>
        </div>

        {/* Issue Description */}
        <div className="mt-3">
          <p className="font-sans text-xs text-ink/80 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Attached Student Details (Automatic identity handoff) */}
        <div className="mt-3.5 rounded-sm border border-clay/50 bg-clay/10 p-2.5 text-xs font-sans space-y-1">
          <div className="flex justify-between">
            <span className="text-ink/60">Reported by:</span>
            <span className="font-medium text-ink">{student.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/60">College Email:</span>
            <span className="text-ink">{student.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/60">PRN:</span>
            <span className="font-mono text-ink">{student.prn}</span>
          </div>
          {referenceId && (
            <div className="flex justify-between pt-0.5 border-t border-clay/40">
              <span className="text-ink/60">Related Reference:</span>
              <span className="font-mono text-ink font-medium">{referenceId}</span>
            </div>
          )}
        </div>

        {/* Card Actions */}
        {!isSubmitted ? (
          <div className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onAddMore}
              disabled={isSubmitting}
              className="
                w-full sm:w-auto rounded-sm border border-clay px-3 py-1.5
                font-sans text-xs font-medium text-ink/70 hover:text-ink hover:bg-clay/15
                transition-colors duration-120 cursor-pointer
              "
            >
              Let me add more
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className={`
                group relative w-full sm:w-auto rounded-sm px-4 py-1.5
                font-sans text-xs font-medium text-bone
                transition-[background-color,transform] duration-150 ease-out
                ${
                  isSubmitting
                    ? 'cursor-not-allowed bg-clay text-ink/40'
                    : 'cursor-pointer bg-moss hover:bg-moss-hover active:scale-[0.97]'
                }
              `}
            >
              <span className="relative z-10">
                {isSubmitting ? 'Routing ticket…' : 'Looks right, submit'}
              </span>

              {/* Hover underline grow */}
              {!isSubmitting && (
                <span
                  className="
                    absolute bottom-1 left-1/2 h-px w-3/5
                    -translate-x-1/2 scale-x-0 bg-bone/50
                    transition-transform duration-150 ease-out
                    group-hover:scale-x-100
                  "
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 font-sans text-xs text-moss font-medium">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Ticket filed and dispatched to campus admin queue</span>
          </div>
        )}
      </div>
    </div>
  );
}
