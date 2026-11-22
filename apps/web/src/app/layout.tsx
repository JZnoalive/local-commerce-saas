import type { Metadata } from "next";
import "./globals.css";
import ChessArchitectSigil from "@/components/ChessArchitectSigil";

export const metadata: Metadata = {
  title: "Comercio Local - Pueblo Nuevo, Córdoba",
  description: "Directorio comercial, inventario en vivo y domicilios con IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <ChessArchitectSigil />
      </body>
    </html>
  );
}
