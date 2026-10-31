"use client";
import { useEffect, useState } from "react";
import type { MunicipalBalancePage, MunicipalBalanceRow } from "@/lib/municipal-balance";
export function useMunicipalBalances(uf: string, year: number, month: string) {
  const key = `${uf}/${year}/${month}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; rows: Record<string, MunicipalBalanceRow>; period: number | null; total: number; processed: number; loading: boolean; error: string | null }>({ key: "", rows: {}, period: null, total: 0, processed: 0, loading: false, error: null });
  useEffect(() => {
    if (uf === "DF") return;
    const controller = new AbortController(); let disposed = false;
    setState({ key, rows: {}, period: null, total: 0, processed: 0, loading: true, error: null });
    const query = new URLSearchParams({ uf, year: String(year), month });
    async function page(offset: number, period?: number) {
      const params = new URLSearchParams(query); params.set("offset", String(offset));
      if (period !== undefined) params.set("period", String(period));
      const response = await fetch(`/api/saldos-municipais?${params}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(50000)]) });
      const data = await response.json() as MunicipalBalancePage & { error?: string };
      if (!response.ok) throw new Error(data.error || "Comparação temporariamente indisponível.");
      if (data.uf !== uf || data.year !== year || data.offset !== offset || period !== undefined && data.period !== period) throw new Error("O período dos dados mudou. Consulte novamente as cores.");
      if (!disposed) setState(previous => {
        const rows = { ...previous.rows };
        for (const row of data.records) rows[row.id] = row;
        return { key, rows, period: data.period, total: data.total, processed: Object.keys(rows).length, loading: true, error: previous.error };
      });
      return data;
    }
    void (async () => {
      try {
        const first = await page(0);
        if (disposed) return;
        if (first.records.length && first.records.every(row => row.status === "error")) throw new Error("O Tesouro está indisponível para a comparação. Tente novamente.");
        const size = first.records.length;
        if (!size) throw new Error("A fonte não retornou os municípios esperados.");
        const offsets: number[] = [];
        for (let offset = size; offset < first.total; offset += size) offsets.push(offset);
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(2, offsets.length) }, async () => {
          while (cursor < offsets.length && !disposed) {
            const offset = offsets[cursor++];
            try { await page(offset, first.period); }
            catch (error) {
              if (controller.signal.aborted) return;
              if (!disposed) setState(previous => ({ ...previous, error: error instanceof Error ? error.message : "Algumas cidades não puderam ser consultadas." }));
            }
          }
        }));
      } catch (error) {
        if (!disposed && !controller.signal.aborted) setState(previous => ({ ...previous, error: error instanceof Error ? error.message : "Comparação indisponível." }));
      } finally { if (!disposed) setState(previous => ({ ...previous, loading: false })); }
    })();
    return () => { disposed = true; controller.abort(); };
  }, [uf, year, month, key, attempt]);
  const visible = state.key === key ? state : { key, rows: {}, period: null, total: 0, processed: 0, loading: uf !== "DF", error: null };
  return { ...visible, retry: () => setAttempt(value => value + 1) };
}
