"use client";
import { useEffect, useRef } from "react";
import { ArrowRight, Quote, X } from "lucide-react";
export function CitizenshipWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try { if (sessionStorage.getItem("cmi-welcome-2026") === "seen") return; } catch { /* A leitura do site não depende de armazenamento. */ }
    dialog.current?.showModal();
  }, []);
  function remember() { try { sessionStorage.setItem("cmi-welcome-2026", "seen"); } catch { /* Preferência opcional. */ } }
  function close() { remember(); dialog.current?.close(); }
  return <dialog ref={dialog} className="dash-dialog citizenship-welcome" aria-labelledby="welcome-title" onClose={remember}>
    <div className="dialog-heading"><span className="dash-eyebrow">CIDADANIA COMEÇA COM INFORMAÇÃO</span><button aria-label="Fechar mensagem de boas-vindas" onClick={close}><X size={20} /></button></div>
    <Quote className="welcome-quote-icon" size={32} aria-hidden="true" />
    <h2 id="welcome-title">Seu imposto merece acompanhamento.</h2>
    <blockquote>“Para que não se possa abusar do poder, é preciso que o poder limite o poder.”</blockquote>
    <p className="quote-credit">Montesquieu · <cite>O Espírito das Leis</cite>, livro XI, capítulo IV.<br /><a href="https://fr.wikisource.org/wiki/Esprit_des_lois_(1777)/L11/C4" target="_blank" rel="noreferrer">Trecho em tradução livre · conferir original ↗</a></p>
    <p>Conheça os gastos, confira as fontes e cobre resultados dos seus representantes.</p>
    <button className="welcome-start" onClick={close}>Explorar as contas de 2026 <ArrowRight size={18} aria-hidden="true" /></button>
  </dialog>;
}
