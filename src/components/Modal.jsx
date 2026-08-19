import { X } from "@phosphor-icons/react";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, className = "" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-7 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold tracking-[0.01em] text-white">
            {title}
          </h2>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} weight="bold" />
            <span className="sr-only">Закрыть</span>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
