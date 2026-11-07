// Marca: culorile pe roluri, fonturile, tonul, mențiunile și mascota. Tot ce verifică garda vine de aici.
// În dreapta, o postare de exemplu compusă cu aceeași funcție ca în kit, care urmărește formularul.
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button, Card, ErrorNote, PageHeader } from "../../components/ui";
import { Brand, type ColorRole, demoBrand } from "../../lib/brand";
import { brands, brandSample } from "../../lib/campaigns";
import { readFile, toDataUrl } from "../../lib/spireImages";
import { useCollection } from "../../lib/store";
import { useMascotPage } from "../../modules/mascot/page";
import { DesignPreview } from "./DesignPreview";

const ROLES: Array<[ColorRole, string]> = [
  ["primary", "Principală"],
  ["accent", "Accent"],
  ["background", "Fundal"],
  ["text", "Text"],
];
const FIELD = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[0.95rem] text-ink";

/** În locul lui „Choose File”: un buton în română, cu inputul ascuns dedesubt. */
function FileButton({ name, children, onFile }: { name: string; children: string; onFile: (file: File) => void }) {
  return (
    <label className="btn btn-secondary mt-1 cursor-pointer">
      {children}
      <input
        type="file"
        accept="image/*"
        aria-label={name}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function BrandPage() {
  const { items, update, loading } = useCollection(brands);
  const rec = items[0];
  const [form, setForm] = useState<Brand>(demoBrand);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rec) setForm(rec.data);
  }, [rec]);

  useMascotPage({ title: "Marca", context: () => `Marca: ${form.name}, mascota ${form.mascot.name}.` });

  const edit = (next: Partial<Brand>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...next }));
  };
  const color = (role: ColorRole) => form.colors.find((c) => c.role === role)?.hex ?? "#000000";
  const upload = (file: File, apply: (image: string) => void) => {
    setError(null);
    readFile(file)
      .then((image) => toDataUrl(image, { max: 512, type: "image/png" }))
      .then(apply)
      .catch((err: Error) => setError(err.message));
  };

  // cât scrii, formularul răspunde primul; postarea o ajunge din urmă
  const previewed = useDeferredValue(form);
  const sample = useMemo(() => brandSample(previewed), [previewed]);

  const save = async () => {
    const parsed = Brand.safeParse(form);
    if (!parsed.success || !rec) return setError("Verifică marca: numele, cele patru culori și mascota sunt obligatorii.");
    setError(null);
    try {
      await update(rec.id, parsed.data);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <p className="text-sm text-muted">Se încarcă…</p>;

  return (
    <div>
      <PageHeader title="Marca" description="O completezi o dată. Spire pune aceste culori, fonturi și mascota pe orice stil alegi." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card title="Cine ești">
            <div className="space-y-3">
              <label className="block text-sm text-ink-2">
                Numele mărcii
                <input className={FIELD} value={form.name} onChange={(e) => edit({ name: e.target.value })} />
              </label>
              <label className="block text-sm text-ink-2">
                Tonul
                <textarea rows={2} className={FIELD} value={form.tone} onChange={(e) => edit({ tone: e.target.value })} />
              </label>
              <label className="block text-sm text-ink-2">
                Mențiuni obligatorii, câte una pe rând
                <textarea rows={2} className={FIELD} value={form.mandatory.join("\n")} onChange={(e) => edit({ mandatory: e.target.value.split("\n").filter((l) => l.trim()) })} />
              </label>
              <div className="text-sm text-ink-2">
                <p>Logo</p>
                <div className="flex items-center gap-3">
                  {form.logo && <img src={form.logo} alt="Logo-ul mărcii" className="mt-1 h-10 w-10 rounded-lg border border-line object-contain" />}
                  <FileButton name="Logo" onFile={(file) => upload(file, (logo) => edit({ logo }))}>
                    {form.logo ? "Schimbă logo-ul" : "Alege un logo"}
                  </FileButton>
                </div>
              </div>
            </div>
          </Card>
          <Card title="Culori și fonturi">
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(([role, label]) => (
                <label key={role} className="flex min-w-0 items-center gap-2 text-sm text-ink-2">
                  <input type="color" aria-label={`Culoarea ${label}`} value={color(role)} onChange={(e) => edit({ colors: form.colors.map((c) => (c.role === role ? { ...c, hex: e.target.value.toUpperCase() } : c)) })} className="h-9 w-11 shrink-0 rounded border border-line bg-white" />
                  {label}
                </label>
              ))}
              <label className="block min-w-0 text-sm text-ink-2">
                Fontul titlurilor
                <input className={FIELD} value={form.fonts.heading} onChange={(e) => edit({ fonts: { ...form.fonts, heading: e.target.value } })} />
              </label>
              <label className="block min-w-0 text-sm text-ink-2">
                Fontul textului
                <input className={FIELD} value={form.fonts.body} onChange={(e) => edit({ fonts: { ...form.fonts, body: e.target.value } })} />
              </label>
            </div>
          </Card>
          <Card title="Mascota">
            <div className="flex gap-4 max-sm:flex-col">
              <img src={form.mascot.image} alt={`Mascota ${form.mascot.name}`} className="h-28 w-28 shrink-0 rounded-lg border border-line object-contain" />
              <div className="min-w-0 flex-1 space-y-3">
                <label className="block text-sm text-ink-2">
                  Numele mascotei
                  <input className={FIELD} value={form.mascot.name} onChange={(e) => edit({ mascot: { ...form.mascot, name: e.target.value } })} />
                </label>
                <label className="block text-sm text-ink-2">
                  Cum arată
                  <textarea rows={3} className={FIELD} value={form.mascot.description} onChange={(e) => edit({ mascot: { ...form.mascot, description: e.target.value } })} />
                </label>
                <div className="text-sm text-ink-2">
                  <p>Poza mascotei</p>
                  <FileButton name="Poza mascotei" onFile={(file) => upload(file, (image) => edit({ mascot: { ...form.mascot, image } }))}>
                    Schimbă poza
                  </FileButton>
                </div>
              </div>
            </div>
          </Card>
          <ErrorNote error={error} />
          <div className="flex items-center gap-3">
            <Button variant="ink" onClick={() => void save()}>
              Salvează marca
            </Button>
            {saved && <span className="text-sm text-ok">Marca e salvată</span>}
          </div>
        </div>
        {/* pe telefon stă deasupra, altfel n-ai vedea ce schimbi */}
        <aside className="card max-lg:order-first max-lg:mx-auto max-lg:w-full max-lg:max-w-[240px] lg:sticky lg:top-24" aria-label="Exemplu pe marca ta" data-testid="marca-exemplu">
          <div className="overflow-hidden rounded-t-[13px] border-b border-line">
            <DesignPreview design={sample} className="block h-auto w-full" />
          </div>
          <p className="px-3 py-2.5 text-[0.85rem] text-ink-2">O postare de exemplu, pe marca {previewed.name || "ta"}.</p>
        </aside>
      </div>
    </div>
  );
}
