import Image from 'next/image'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import './globals.css'

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
      <div className="flex items-center gap-2">
        <Image
          src="/OpenTier/logo.svg"
          alt="OpenTier Logo"
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <b className="text-base">OpenTier Docs</b>
      </div>
    }
  />
)

const footer = (
  <Footer className="w-full max-w-none">
    <div className="flex w-full flex-row items-center justify-between px-4 py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        MIT {new Date().getFullYear()} © OpenTier
      </span>

      <div className="flex flex-row items-center gap-5 text-gray-600 transition-colors dark:text-gray-400">
        {/* Portfolio */}
        <a
          href="https://yashkumarsingh.me"
          target="_blank"
          rel="noopener noreferrer"
          title="Portfolio"
          className="flex items-center transition-colors hover:text-gray-900 dark:hover:text-gray-100"
        >
          <div
            className="h-5.5 w-5.5 bg-current mask-center mask-no-repeat mask-contain"
            style={{
              WebkitMaskImage: 'url(/OpenTier/hat-glasses.svg)',
              maskImage: 'url(/OpenTier/hat-glasses.svg)',
            }}
          />
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/Celestial-0/OpenTier"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
          className="flex items-center transition-colors hover:text-gray-900 dark:hover:text-gray-100"
        >
          <div
            className="h-5.5 w-5.5 bg-current mask-center mask-no-repeat mask-contain"
            style={{
              WebkitMaskImage: 'url(/OpenTier/github.svg)',
              maskImage: 'url(/OpenTier/github.svg)',
            }}
          />
        </a>
      </div>
    </div>
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen">
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/Celestial-0/OpenTier/tree/main/client/docs"
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