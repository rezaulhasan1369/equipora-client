import { DiscoveryProvider } from "@/components/discovery";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { SessionProvider } from "@/components/session";
import { Header, Footer } from "@/components/shell";
import "./style.css";
import { ToastProvider } from "@/components/toast";
export const metadata: Metadata = {
  title: {
    default: "Equipora — Equipment for what’s next",
    template: "%s | Equipora",
  },
  icons: {
    icon: [
      {
        url: "/assets/branding/equipora-symbol-slate-64.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        url: "/assets/branding/equipora-symbol-slate-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/assets/branding/equipora-symbol-slate-256.png",
  },
  description:
    "Find and rent equipment for your next project. Explore construction, photography, agriculture, electronics and event equipment.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="equipora-theme-init"
          dangerouslySetInnerHTML={{
            __html:
              '(()=>{let p;try{p=localStorage.getItem("equipora-theme")}catch{}const explicit=p==="dark"||p==="light";document.documentElement.dataset.theme=explicit?p:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.themePreference=explicit?"explicit":"system"})()',
          }}
        />
      </head>
      <body>
        <SessionProvider>
          <ToastProvider>
            <DiscoveryProvider>
              <a href="#main-content" className="skip-link">
                Skip to content
              </a>
              <Header />
              <main id="main-content">{children}</main>
              <Footer />
            </DiscoveryProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
