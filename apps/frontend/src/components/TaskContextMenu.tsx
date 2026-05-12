import { useEffect, useRef } from "react";

export interface TaskContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: Array<{
    id: string;
    label: string;
    disabled?: boolean;
    danger?: boolean;
    onSelect: () => void;
  }>;
}

export function TaskContextMenu({ x, y, onClose, items }: TaskContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  // Clamp to viewport so we don't overflow the right/bottom edges.
  const MENU_W = 168;
  const MENU_H = items.length * 32 + 8;
  const left = Math.min(x, window.innerWidth - MENU_W - 4);
  const top = Math.min(y, window.innerHeight - MENU_H - 4);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ position: "fixed", top, left, width: MENU_W, zIndex: 60 }}
      className="overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.onSelect();
            onClose();
          }}
          className={`block w-full px-3 py-1.5 text-left text-xs transition ${
            item.disabled
              ? "cursor-not-allowed text-slate-300"
              : item.danger
                ? "text-rose-700 hover:bg-rose-50"
                : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
