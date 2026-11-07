// Marca: culorile pe roluri, fonturile, tonul, mențiunile și mascota. Tot ce verifică garda vine de aici.
import { useEffect, useState } from "react";
import { Button, Card, ErrorNote, PageHeader } from "../../components/ui";
import { Brand, type ColorRole, demoBrand } from "../../lib/brand";
import { brands } from "../../lib/campaigns";
import { readFile, toDataUrl } from "../../lib/spireImages";
import { useCollection } from "../../lib/store";
import { useMascotPage } from "../../modules/mascot/page";

const ROLES: Array<[ColorRole, string]> = [
  ["primary", "Principală"],
  ["accent", "Accent"],
  ["background", "Fundal"],
  ["text", "Text"],
];
const FIELD = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[0.95rem] text-ink";

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
  const upload = async (file: File | undefined, apply: (image: string) => void) => {
    if (file) apply(await toDataUrl(await readFile(file), { max: 512, type: "image/png" }));
  };

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
    <div className="space-y-5">
      <PageHeader title="Marca" description="O completezi o dată. Spire pune aceste culori, fonturi și mascota pe orice stil alegi." />
      <div className="grid gap-5 lg:grid-cols-2">
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
            <label className="block text-sm text-ink-2">
              Logo
              <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => void upload(e.target.files?.[0], (logo) => edit({ logo }))} />
            </label>
          </div>
        </Card>
        <Card title="Culori și fonturi">
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(([role, label]) => (
              <label key={role} className="flex items-center gap-2 text-sm text-ink-2">
                <input type="color" aria-label={`Culoarea ${label}`} value={color(role)} onChange={(e) => edit({ colors: form.colors.map((c) => (c.role === role ? { ...c, hex: e.target.value.toUpperCase() } : c)) })} className="h-9 w-11 rounded border border-line bg-white" />
                {label}
              </label>
            ))}
            <label className="block text-sm text-ink-2">
              Fontul titlurilor
              <input className={FIELD} value={form.fonts.heading} onChange={(e) => edit({ fonts: { ...form.fonts, heading: e.target.value } })} />
            </label>
            <label className="block text-sm text-ink-2">
              Fontul textului
              <input className={FIELD} value={form.fonts.body} onChange={(e) => edit({ fonts: { ...form.fonts, body: e.target.value } })} />
            </label>
          </div>
        </Card>
        <Card title="Mascota">
          <div className="flex gap-4">
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
              <label className="block text-sm text-ink-2">
                Poza mascotei
                <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => void upload(e.target.files?.[0], (image) => edit({ mascot: { ...form.mascot, image } }))} />
              </label>
            </div>
          </div>
        </Card>
      </div>
      <ErrorNote error={error} />
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => void save()}>
          Salvează marca
        </Button>
        {saved && <span className="text-sm text-ok">Marca e salvată</span>}
      </div>
    </div>
  );
}
