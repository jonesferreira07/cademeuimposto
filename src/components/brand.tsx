import Link from "next/link";
import Image from "next/image";
export function Brand({ light = false, onHome }: { light?: boolean; onHome?: () => void }) {
  return <Link href="/" onClick={onHome ? event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) onHome(); } : undefined} aria-label="Cadê Meu Imposto? Página inicial" className={`brand ${light ? "brand-light" : ""}`}>
    <span className="brand-art"><Image src="/brand-logo.png" alt="" width={64} height={64} sizes="64px" priority /></span>
    <span>cadê meu<span className="brand-second">imposto<span className="brand-question">?</span></span></span>
  </Link>;
}
