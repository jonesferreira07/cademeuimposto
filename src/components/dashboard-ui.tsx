"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, RefreshCw } from "lucide-react";

export function useData<T>(url: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ url: string | null; data: T | null; error: string | null; loading: boolean }>({ url: null, data: null, error: null, loading: false });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController(); let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 55000);
    setState({ url, data: null, error: null, loading: true });
    fetch(url, { signal: controller.signal }).then(async response => {
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "A fonte está indisponível."); return payload as T;
    }).then(data => { if (!disposed) setState({ url, data, error: null, loading: false }); }).catch(error => { if (!disposed) setState({ url, data: null, error: error.name === "AbortError" ? "A consulta demorou mais que o esperado. Tente novamente." : error.message, loading: false }); }).finally(() => clearTimeout(timeout));
    return () => { disposed = true; controller.abort(); clearTimeout(timeout); };
  }, [url, attempt]);
  return { ...(state.url === url && url ? state : { data: null, error: null, loading: !!url }), retry: () => setAttempt(a => a + 1) };
}
export function Loading({ text = "Consultando a fonte oficial…" }: { text?: string }) { return <div className="dash-status" role="status"><span className="spinner" /><p>{text}</p></div>; }
export function Failure({ message, retry }: { message: string; retry: () => void }) { return <div className="dash-status dash-error" role="alert"><CircleAlert size={25} /><p>{message}</p><button onClick={retry}><RefreshCw size={13} /> Tentar novamente</button></div>; }
export function Pager({ page, total, onPage, extraNext = false, extraPrevious = false }: { page: number; total: number; onPage: (page: number) => void; extraNext?: boolean; extraPrevious?: boolean }) { return <div className="dash-pager"><button aria-label="Página anterior" disabled={page <= 0 && !extraPrevious} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button><span>{page + 1} / {Math.max(total, 1)}{extraNext ? "+" : ""}</span><button aria-label="Próxima página" disabled={!extraNext && page + 1 >= total} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button></div>; }
