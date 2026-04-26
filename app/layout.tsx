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
    <html lang="ko">
      <head>
        <link rel="stylesheet" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}