// „Cine sunt”: roluri fără login, schimbate dintr-un clic (pentru demo cu un singur laptop)
// sau pe telefon cu ?ca=<handle>. Persoanele vin din seed-ul scenariului.
import { useMe } from "../../lib/identity";
import { scenario } from "../config";

export function RoleSwitcher() {
  const { me, people, setMe } = useMe();
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="hidden sm:inline">Sunt</span>
      <select
        value={me?.handle ?? ""}
        onChange={(e) => setMe(e.target.value)}
        className="max-w-[36vw] rounded-full bg-paper-2 py-1.5 pr-8 pl-3 text-sm font-medium text-ink ring-1 ring-line sm:max-w-[230px]"
        aria-label="Cine sunt"
        data-testid="role-switcher"
      >
        {!me && <option value="">alege…</option>}
        {Object.keys(scenario.roles).map((role) => (
          <optgroup key={role} label={scenario.roles[role].plural}>
            {people
              .filter((p) => p.role === role)
              .map((p) => (
                <option key={p.handle} value={p.handle}>
                  {p.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
