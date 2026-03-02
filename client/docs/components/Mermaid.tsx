'use client'

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useTheme } from 'next-themes'

let lastThemeInitialized = ''

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  // useTheme from next-themes provides the current resolved theme ('light' or 'dark')
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Only re-initialize mermaid if the theme has changed or it's the first run
    if (resolvedTheme && lastThemeInitialized !== resolvedTheme) {
      if (resolvedTheme === 'dark') {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark', // Changed to dark base to fix unstyled white backgrounds
          themeVariables: {
            // Nextra-inspired: Black base + Zinc/Grey + Light Blue Accent
            // Nodes
            primaryColor: '#09090b',        // Zinc-950 (very dark grey, almost black)
            primaryTextColor: '#f4f4f5',    // Zinc-100 (clean white/grey)
            primaryBorderColor: '#3b82f6',  // Nextra/Tailwind Blue-500 for primary border accent

            // Edges & Lines
            lineColor: '#52525b',           // Zinc-600 (distinct grey, not distracting)
            edgeLabelBackground: '#09090b', // Matches node background

            // Clusters / Subgraphs
            clusterBkg: '#18181b',          // Zinc-900 (slightly lighter to distinguish from pure background)
            clusterBorder: '#27272a',       // Zinc-800

            // Alternates
            secondaryColor: '#09090b',      // Zinc-950
            secondaryBorderColor: '#60a5fa',// Tailwind Blue-400 (lighter blue)
            tertiaryColor: '#09090b',       // Zinc-950
            tertiaryBorderColor: '#2563eb', // Tailwind Blue-600 (darker blue)

            // Notes
            noteBkgColor: '#27272a',        // Zinc-800
            noteTextColor: '#f4f4f5',       // Zinc-100
            noteBorderColor: '#52525b',     // Zinc-600

            // ER Diagrams specific overrides
            mainBkg: '#09090b',             // Zinc-950 (Entities)
            titleColor: '#f4f4f5',          // Zinc-100 (Title text)
            nodeTextColor: '#f4f4f5',       // Zinc-100 (Node text)
            nodeBorderColor: '#3b82f6',     // Nextra Blue (Entity borders)
            textColor: '#f4f4f5',           // Zinc-100 (General text fallback)
            attributeBackgroundColorEven: '#09090b', // Zinc-950 (Entity Attributes bg)
            attributeBackgroundColorOdd: '#18181b',  // Zinc-900 (Entity Attributes odd bg)

            // Sequence Diagrams specific overrides
            actorBkg: '#09090b',
            actorBorder: '#3b82f6',
            actorTextColor: '#f4f4f5',
            actorLineColor: '#52525b',
            signalColor: '#f4f4f5',
            signalTextColor: '#f4f4f5',
            labelBoxBkgColor: '#09090b',
            labelBoxBorderColor: '#3b82f6',
            labelTextColor: '#f4f4f5',
            loopTextColor: '#f4f4f5',
            activationBorderColor: '#3b82f6',
            activationBkgColor: '#18181b',
            sequenceNumberColor: '#f4f4f5',

            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '14px', // Slightly smaller for monospace to fit well
          },
          flowchart: {
            curve: 'basis',
            nodeSpacing: 80,
            rankSpacing: 80,
            padding: 24,
          },
          sequence: {
            width: 200,
            height: 50,
            // actorMargin: 60,
            // boxMargin: 8,
            // boxTextMargin: 5,
            // noteMargin: 12,
            // messageMargin: 40,
            // mirrorActors: true,
            // bottomMarginAdj: 2,
            // useMaxWidth: false,
          },
        })
      } else {
        // Light mode configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default', // Use mermaid's default light theme
          themeVariables: {
            // Light purple overrides for clusters/subgraphs specifically requested
            clusterBkg: '#faf5ff',    // Very light slate-purple (tailwind slate-50/purple tint)
            clusterBorder: '#d8b4fe', // Light purple border (tailwind purple-300)

            // Apply the same light purple to note boxes (like "same-origin ~1 ms")
            noteBkgColor: '#faf5ff',
            noteBorderColor: '#d8b4fe',

            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '14px', // Slightly smaller for monospace
          },
          flowchart: {
            curve: 'basis',
            nodeSpacing: 80,
            rankSpacing: 80,
            padding: 24,
          },
          sequence: {
            width: 200,
            height: 50,
            // actorMargin: 60,
            // boxMargin: 8,
            // boxTextMargin: 5,
            // noteMargin: 12,
            // messageMargin: 40,
            // mirrorActors: true,
            // bottomMarginAdj: 2,
            // useMaxWidth: false,
          },
        })
      }
      lastThemeInitialized = resolvedTheme
    }

    const renderChart = async () => {
      // Don't attempt to render until the theme is resolved
      if (!resolvedTheme) return

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        // Add a slight delay to ensure fonts/layout are ready
        setTimeout(async () => {
          const { svg: renderedSvg } = await mermaid.render(id, chart)
          setSvg(renderedSvg)
        }, 50)
      } catch (error) {
        console.error('Failed to render mermaid diagram', error)
        setSvg(`<pre class="text-red-500 p-4 border border-red-900 rounded bg-red-950/20 overflow-auto"><code>${chart}</code></pre>`)
      }
    }

    renderChart()
  }, [chart, resolvedTheme])

  if (!svg) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-dark flex justify-center overflow-x-auto my-8! py-1! px-6! bg-transparent"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
