import type { Metadata } from "next";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import { AppToastProvider } from "@/components/layout/app-toast-provider";

export const metadata: Metadata = {
  title: "Demo de Avance Mensual en Tiempo Real",
  description:
    "Checklist mensual por actividad con indicadores por empleado, equipo y avance general.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <AppToastProvider />
      </body>
    </html>
  );
}
