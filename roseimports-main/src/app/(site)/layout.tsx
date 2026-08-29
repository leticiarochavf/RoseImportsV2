import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FooterSlot } from "@/components/footer-slot";

/**
 * Layout de todo o site — inclusive do painel, que é uma área dele.
 * O rodapé é o único pedaço que fica de fora do /admin.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <FooterSlot>
        <SiteFooter />
      </FooterSlot>
    </div>
  );
}
