import "./globals.css"

export const metadata = {
  title: "METARICH SIGNAL-GROUP",
  description: "Internal Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}