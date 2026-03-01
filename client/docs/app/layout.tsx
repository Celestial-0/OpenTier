import Image from 'next/image'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'


export const metadata = {
  title: {
    default: 'OpenTier Docs',
    template: '%s — OpenTier Docs',
  },
  description:
    'Technical architecture documentation for the OpenTier AI platform — a production-grade RAG system with web scraping capabilities.',
  icons: {
    icon: '/OpenTier/logo.svg',
    shortcut: '/OpenTier/logo.svg',
    apple: '/OpenTier/logo.svg',
  },
}

const navbar = (
  <Navbar
    logo={
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Image src="/OpenTier/logo.svg" alt="OpenTier Logo" width={32} height={32} />
        <b>OpenTier Docs</b>
      </div>
    }
  />
)

const footer = (
  <Footer className="flex items-center justify-between px-4 py-3">
    <span>
      MIT {new Date().getFullYear()} © OpenTier
    </span>

    <a
      href="https://github.com/Celestial-0/OpenTier"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image src="/OpenTier/github.svg" alt="GitHub" width={32} height={32} />
    </a>
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/opentier/opentier/tree/main/client/docs"
          footer={footer}
          editLink="Edit this page on GitHub"
          feedback={{ content: 'Question? Give us feedback →' }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
