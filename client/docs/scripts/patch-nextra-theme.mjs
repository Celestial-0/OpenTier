import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const layoutPath = fileURLToPath(
  new URL('../node_modules/nextra-theme-docs/dist/layout.js', import.meta.url),
)
const current = await readFile(layoutPath, 'utf8')
const broken = 'LayoutPropsSchema.safeParse(themeConfig)'
const fixed = 'LayoutPropsSchema.safeParse({ ...themeConfig, children })'

if (current.includes(fixed)) {
  process.exit(0)
}

if (!current.includes(broken)) {
  throw new Error('Unexpected nextra-theme-docs layout.js; compatibility patch was not applied.')
}

await writeFile(layoutPath, current.replace(broken, fixed))