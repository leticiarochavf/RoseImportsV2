import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FooterSlot } from "@/components/footer-slot";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col font-sans antialiased">
      <SiteHeader />

      <main className="flex-1">
        {children}
      </main>

      <FooterSlot>
        <SiteFooter />
      </FooterSlot>
    </div>
  );
}