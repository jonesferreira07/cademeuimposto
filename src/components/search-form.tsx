import { Search, ArrowRight } from "lucide-react";
import { states } from "@/lib/states";
export function SearchForm({ q = "", uf = "", compact = false }: { q?: string; uf?: string; compact?: boolean }) {
  return <form action="/deputados" method="get" className={`search-form ${compact ? "compact" : ""}`} role="search">
    <div className="search-field"><Search size={20} aria-hidden="true" /><label htmlFor="deputy-search" className="sr-only">Nome do parlamentar</label><input id="deputy-search" type="search" name="q" maxLength={100} defaultValue={q} placeholder="Busque pelo nome de um deputado" /></div>
    {compact && <><label htmlFor="state-filter" className="sr-only">Filtrar por estado</label><select id="state-filter" name="uf" defaultValue={uf}><option value="">Todos os estados</option>{states.map(s => <option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>)}</select></>}
    <button type="submit">Buscar <ArrowRight size={17} /></button>
  </form>;
}
