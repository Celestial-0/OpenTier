import nextra from 'nextra'

const withNextra = nextra({
  latex: true
})

export default withNextra({
  output: 'export',
  basePath: '/OpenTier',
  images: {
    unoptimized: true
  }
})
