import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/hooks/use-auth"
import { WalletProvider } from "@/hooks/use-wallet"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ChessStake - Plataforma de Xadrez com Apostas",
  description: "Jogue xadrez e aposte em criptomoedas na plataforma mais moderna do Brasil",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </AuthProvider>
          <Toaster theme="dark" position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
