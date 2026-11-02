import { useEffect, useState } from "react";
import { qrDataUrl } from "../lib/share";

/** QR + link sub el. Pentru „ia-ți rezultatul pe telefon" sau „intră în cameră". */
export function QrPanel({ url, label, size = 220 }: { url: string; label?: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    qrDataUrl(url, size * 2).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {src ? (
        <img src={src} width={size} height={size} alt={`Cod QR pentru ${url}`} className="rounded-xl bg-white p-2" />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-slate-800" />
      )}
      {label && <p className="text-sm font-medium">{label}</p>}
      <a href={url} target="_blank" rel="noreferrer" className="max-w-[280px] truncate text-xs text-sky-300 underline">
        {url}
      </a>
    </div>
  );
}
