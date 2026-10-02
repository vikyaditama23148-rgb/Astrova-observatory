import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astrova Observatory — Explore the Solar System",
  description: "Observatorium 3D interaktif untuk menjelajahi Tata Surya: orbit, rotasi, planet, dan waktu simulasi. Bagian dari ekosistem Astrova.",
  applicationName: "Astrova Observatory",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Astrova Observatory — Explore the Solar System",
    description: "Jelajahi Tata Surya dalam 3D interaktif.",
    type: "website",
    siteName: "Astrova Observatory",
  },
  twitter: { card: "summary", title: "Astrova Observatory — Explore the Solar System", description: "Jelajahi Tata Surya dalam 3D interaktif." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#02030a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
