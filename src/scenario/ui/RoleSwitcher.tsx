// Meniul de cont: cine sunt acum (roluri fără login). Arată ca într-un produs real (inițiale, nume,
// rol), dar dedesubt e un <select> nativ: se schimbă dintr-un clic la demo cu un singur laptop,
// sau pe telefon cu ?ca=<handle>. Persoanele vin din seed-ul scenariului.
import { useMe } from "../../lib/identity";
import { scenario } from "../config";
import { Avatar } from "./parts";

export function RoleSwitcher() {
  const { me, people, setMe } = useMe();
  return (
    <label className="relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-paper-2" title="Schimbă persoana (pentru demo)">
      <Avatar name={me?.name ?? "?"} size={30} />
      <span className="hidden min-w-0 text-left leading-tight sm:block">
        <span className="block max-w-[160px] truncate text-sm font-medium text-ink">{me?.name ?? "Alege cine ești"}</span>
        {me && <span className="block text-xs text-muted">{scenario.roles[me.role]?.label}</span>}
      </span>
      <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted" aria-hidden>
        <path d="M2 3.5 5 6.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        value={me?.handle ?? ""}
        onChange={(e) => setMe(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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
