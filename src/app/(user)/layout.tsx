import { SiteHeader } from "@/components/site-header";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      {children}
    </div>
  );
}
