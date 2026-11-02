// Link + QR pentru ca juriul să-și ia rezultatul pe telefon.
//  - cu Supabase: urcă PNG-ul în Storage și dă link public direct la imagine
//  - fără Supabase: pune designul comprimat în URL (/view#...), dacă încape în QR

import LZString from "lz-string";
import QRCode from "qrcode";
import { Design, type Design as DesignType } from "./design";
import { shareBucket, supabase } from "./supabase";

/** Un QR rămâne ușor de scanat sub ~2000 de caractere. */
export const MAX_QR_URL = 2000;

export function encodeDesign(design: DesignType): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(design));
}

export function decodeDesign(encoded: string): DesignType | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = Design.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function designViewUrl(design: DesignType, origin = location.origin): string {
  return `${origin}/view#${encodeDesign(design)}`;
}

export interface ShareResult {
  url: string;
  method: "supabase" | "url";
}

export async function shareDesign(design: DesignType, png?: Blob): Promise<ShareResult> {
  if (supabase && png) {
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage.from(shareBucket).upload(path, png, { contentType: "image/png" });
    if (!error) {
      const { data } = supabase.storage.from(shareBucket).getPublicUrl(path);
      return { url: data.publicUrl, method: "supabase" };
    }
    console.warn("[share] upload Supabase eșuat, trec pe link în URL:", error.message);
  }
  const url = designViewUrl(design);
  if (url.length > MAX_QR_URL) {
    throw new Error(
      "Designul e prea mare pentru un QR (are imagini?). Configurează Supabase Storage în .env pentru link-uri scurte.",
    );
  }
  return { url, method: "url" };
}

export function qrDataUrl(text: string, size = 320): Promise<string> {
  return QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "L" });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadText(text: string, filename: string, mime = "image/svg+xml"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
