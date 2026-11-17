interface CreditsModalProps {
  open: boolean
  onClose: () => void
}

export function CreditsModal({ open, onClose }: CreditsModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
        className="w-full max-w-lg rounded-lg border border-brown/40 bg-panel p-6 text-parchment shadow-lg"
      >
        <h2 id="credits-title" className="mb-3 text-xl font-bold text-gold">
          About / Credits
        </h2>
        <p className="text-sm leading-relaxed">
          This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC,
          available at{' '}
          <a
            href="https://www.dndbeyond.com/srd"
            target="_blank"
            rel="noreferrer"
            className="text-sage underline hover:text-gold"
          >
            https://www.dndbeyond.com/srd
          </a>
          . The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-lg bg-sage px-4 py-2 text-ink transition-colors hover:bg-gold"
        >
          Close
        </button>
      </div>
    </div>
  )
}
