import { Analytics } from "@vercel/analytics/next"
<body>
  {children}
  <Analytics />
</body>import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import "./globals.css";
import "./dashboard.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://cademeuimposto.com"),
  title: { default: "Cadê Meu Imposto? | Informação que vira cidadania", template: "%s | Cadê Meu Imposto?" },
  description: "Conheça os deputados federais do seu estado. Explore o mapa do Brasil e consulte informações de fontes oficiais, de forma simples e acessível.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><a href="#conteudo" className="skip-link">Pular para o conteúdo</a><SiteFrame>{children}</SiteFrame></body></html>;
}
