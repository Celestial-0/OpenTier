import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { Mermaid } from './components/Mermaid'

export function useMDXComponents(components: any) {
  const docsComponents = getDocsMDXComponents(components)

  return {
    ...docsComponents,
    Mermaid, // Make Mermaid globally available in all MDX files without importing
  }
}
