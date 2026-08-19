import { Check, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_PALETTE = [
  "#FF7474",
  "#FFB86B",
  "#FFE16B",
  "#A8EC72",
  "#52D6A2",
  "#54C7EC",
  "#2F6EDB",
  "#7768E8",
  "#C76AD8",
  "#ED6B9A",
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function normalizeHex(value) {
  const clean = String(value ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(clean)) {
    return `#${clean.slice(1).split("").map((item) => item.repeat(2)).join("")}`.toUpperCase();
  }
  return null;
}

function hexToHsv(hex) {
  const safe = normalizeHex(hex) ?? "#2F6EDB";
  const red = Number.parseInt(safe.slice(1, 3), 16) / 255;
  const green = Number.parseInt(safe.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(safe.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;
  return {
    h: hue,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function hsvToHex({ h, s, v }) {
  const saturation = clamp(s / 100);
  const value = clamp(v / 100);
  const chroma = value * saturation;
  const sector = ((h % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const match = value - chroma;
  let rgb = [0, 0, 0];

  if (sector < 1) rgb = [chroma, x, 0];
  else if (sector < 2) rgb = [x, chroma, 0];
  else if (sector < 3) rgb = [0, chroma, x];
  else if (sector < 4) rgb = [0, x, chroma];
  else if (sector < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];

  return `#${rgb
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export default function TierColorPicker({ value, onChange, label, palette = DEFAULT_PALETTE }) {
  const safeValue = normalizeHex(value) ?? "#2F6EDB";
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(safeValue));
  const [draftColor, setDraftColor] = useState(safeValue);
  const [hexInput, setHexInput] = useState(safeValue);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const spectrumDragging = useRef(false);
  const hueDragging = useRef(false);

  const setFromHsv = (nextHsv) => {
    const nextColor = hsvToHex(nextHsv);
    setHsv(nextHsv);
    setDraftColor(nextColor);
    setHexInput(nextColor);
  };

  const setFromHex = (nextColor) => {
    const normalized = normalizeHex(nextColor);
    if (!normalized) return;
    setDraftColor(normalized);
    setHexInput(normalized);
    setHsv(hexToHsv(normalized));
  };

  const openPicker = () => {
    const current = normalizeHex(value) ?? "#2F6EDB";
    setDraftColor(current);
    setHexInput(current);
    setHsv(hexToHsv(current));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePress = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const updateSpectrum = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setFromHsv({
      ...hsv,
      s: clamp((event.clientX - bounds.left) / bounds.width) * 100,
      v: (1 - clamp((event.clientY - bounds.top) / bounds.height)) * 100,
    });
  };

  const updateHue = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setFromHsv({
      ...hsv,
      h: clamp((event.clientX - bounds.left) / bounds.width) * 360,
    });
  };

  const picker = open ? createPortal(
    <section
      ref={panelRef}
      className="tier-color-popover"
      role="dialog"
      aria-label={`Выбор цвета ранга ${label}`}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="tier-color-popover-head">
        <div>
          <span>RANK COLOR</span>
          <strong>{label}</strong>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть выбор цвета">
          <X size={15} weight="bold" />
        </button>
      </header>

      <div className="tier-color-preview" style={{ "--preview-color": draftColor }}>
        <span className="tier-color-preview-mark" />
        <div>
          <small>Выбранный цвет</small>
          <code>{draftColor}</code>
        </div>
      </div>

      <div
        className="tier-color-spectrum"
        style={{ "--picker-hue": `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={(event) => {
          event.preventDefault();
          spectrumDragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateSpectrum(event);
        }}
        onPointerMove={(event) => {
          if (spectrumDragging.current) updateSpectrum(event);
        }}
        onPointerUp={() => { spectrumDragging.current = false; }}
        onPointerCancel={() => { spectrumDragging.current = false; }}
      >
        <span
          className="tier-color-spectrum-cursor"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: draftColor }}
        />
      </div>

      <div
        className="tier-color-hue"
        onPointerDown={(event) => {
          event.preventDefault();
          hueDragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHue(event);
        }}
        onPointerMove={(event) => {
          if (hueDragging.current) updateHue(event);
        }}
        onPointerUp={() => { hueDragging.current = false; }}
        onPointerCancel={() => { hueDragging.current = false; }}
      >
        <span style={{ left: `${hsv.h / 3.6}%` }} />
      </div>

      <div className="tier-color-palette" aria-label="Готовые цвета">
        {[...new Set([...palette, ...DEFAULT_PALETTE])].map((color) => (
          <button
            key={color}
            type="button"
            className={normalizeHex(color) === draftColor ? "tier-color-preset-active" : ""}
            style={{ "--preset-color": color }}
            onClick={() => setFromHex(color)}
            aria-label={`Выбрать цвет ${color}`}
          >
            {normalizeHex(color) === draftColor && <Check size={10} weight="bold" />}
          </button>
        ))}
      </div>

      <label className="tier-color-hex">
        <span>HEX</span>
        <input
          value={hexInput}
          maxLength={7}
          spellCheck="false"
          onChange={(event) => {
            const nextValue = event.target.value.toUpperCase();
            setHexInput(nextValue);
            const normalized = normalizeHex(nextValue);
            if (normalized) {
              setDraftColor(normalized);
              setHsv(hexToHsv(normalized));
            }
          }}
          onBlur={() => setHexInput(draftColor)}
          aria-label="Цвет в формате HEX"
        />
      </label>

      <footer className="tier-color-popover-actions">
        <button type="button" onClick={() => setOpen(false)}>Отмена</button>
        <button
          type="button"
          className="tier-color-apply"
          onClick={() => {
            onChange(draftColor);
            setOpen(false);
          }}
        >
          <Check size={14} weight="bold" />
          Применить
        </button>
      </footer>
    </section>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="tier-color-control"
        style={{ "--tier-color": safeValue }}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-label={`Изменить цвет ранга ${label}`}
        aria-expanded={open}
        title={`Цвет ранга ${label}`}
      >
        <span className="tier-color-swatch" aria-hidden="true" />
      </button>
      {picker}
    </>
  );
}
