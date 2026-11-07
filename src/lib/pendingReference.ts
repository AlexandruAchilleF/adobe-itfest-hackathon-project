// Imaginea aleasă pe /acasa, în drum spre /nou. Stă în memorie, deci o reîncărcare a paginii n-o pornește din nou,
// iar o imagine mare nu ajunge în istoricul browserului. Se citește o singură dată.
let pending: string | null = null;

export function setPendingReference(image: string): void {
  pending = image;
}

export const hasPendingReference = (): boolean => pending !== null;

export function takePendingReference(): string | null {
  const image = pending;
  pending = null;
  return image;
}
