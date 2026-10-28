"use client";
import { useRef } from "react";
import { ChevronRight, Megaphone, X } from "lucide-react";

export function AdSlot() {
  const details = useRef<HTMLDialogElement>(null);
  return <>
    <aside className="dash-ad-slot" aria-label="Espaço publicitário">
      <span className="ad-label"><Megaphone size={12} /> PUBLICIDADE</span>
      <div className="ad-offer"><div><strong>Seu anúncio aqui.</strong><span>Valor inicial por anúncio</span></div><b>R$ 1</b></div>
      <button onClick={() => details.current?.showModal()}>Conheça o espaço <ChevronRight size={13} /></button>
    </aside>
    <dialog className="dash-dialog ad-dialog" ref={details} aria-labelledby="ad-title">
      <div className="dialog-heading"><div><span className="dash-eyebrow">ESPAÇO PUBLICITÁRIO</span><h2 id="ad-title">Sua marca neste espaço.</h2></div><button aria-label="Fechar informações do anúncio" onClick={() => details.current?.close()}><X size={20} /></button></div>
      <div className="ad-dialog-price"><strong>R$ 1</strong><span>por anúncio · preço inicial</span></div>
      <div className="dialog-copy"><p>Esta área está reservada para anúncios no Cadê Meu Imposto?. O preço inicial será de R$ 1 por anúncio; duração e regras de exibição serão informadas antes da contratação.</p><p>Em uma próxima etapa, o espaço será oferecido por leilão.</p><div className="ad-status"><span className="live-dot" /> Reservas ainda não disponíveis</div><p>Nenhum pagamento é solicitado nesta etapa. A publicidade será identificada e separada das informações públicas.</p></div>
      <button className="ad-dialog-close" onClick={() => details.current?.close()}>Voltar ao painel</button>
    </dialog>
  </>;
}
