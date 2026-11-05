// „Cine sunt”: roluri fără login, schimbate dintr-un clic (pentru demo cu un singur laptop)
// sau pe telefon cu ?ca=<handle>. Persoanele vin din seed-ul scenariului.
import { useMe } from "../../lib/identity";
import { scenario } from "../config";

export function RoleSwitcher() {
  const { me, people, setMe } = useMe();
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="hidden sm:inline">Sunt</span>
      <select
        value={me?.handle ?? ""}
        onChange={(e) => setMe(e.target.value)}
        className="max-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        aria-label="Cine sunt"
        data-testid="role-switcher"
      >
        {!me && <option value="">alege…</option>}
        {(["giver", "receiver"] as const).map((role) => (
          <optgroup key={role} label={scenario.roles[role].plural}>
            {people
              .filter((p) => p.role === role)
              .map((p) => (
                <option key={p.handle} value={p.handle}>
                  {scenario.roles[role].icon} {p.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
