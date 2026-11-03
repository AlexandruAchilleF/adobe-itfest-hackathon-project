// Text propus de AI pe care omul îl poate corecta direct: se mărește singur pe mai multe rânduri
// (nu taie propozițiile) și la tipărire arată ca text normal, fără chenar.
//
//   <EditableText value={item.text} onChange={(t) => update(i, t)} className="font-bold" />

import { useLayoutEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}

export function EditableText({ value, onChange, className = "", placeholder, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={rest["aria-label"]}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full resize-none overflow-hidden rounded bg-transparent outline-none hover:bg-black/5 focus:bg-black/5 print:hover:bg-transparent ${className}`}
    />
  );
}
