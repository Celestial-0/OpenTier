/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

interface ShaderRippleProps {
  speed?: number
  lineWidth?: number
  rippleCount?: number
  colorLayers?: number
  backgroundColor?: string
  rotation?: number
  timeScale?: number
  opacity?: number
  waveIntensity?: number
  animationSpeed?: number
  loopDuration?: number
  scale?: number
  color1?: string
  color2?: string
  color3?: string
  mod?: number
  className?: string
}

export function ShaderRipple({
  speed = 0.05,
  lineWidth = 0.002,
  rippleCount = 8,
  colorLayers = 3,
  backgroundColor = "transparent",
  rotation = 135,
  timeScale = 0.5,
  opacity = 1,
  waveIntensity = 0,
  animationSpeed = 1,
  loopDuration = 0.7,
  scale = 1,
  color1 = "hsl(var(--primary))",
  color2 = "hsl(var(--secondary))",
  color3 = "hsl(var(--accent))",
  mod = 0.2,
  className = "",
}: ShaderRippleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)


  const rotationRadians = (rotation * Math.PI) / 180

  const colorToVec3 = (color: string) => {
    const c = new THREE.Color(color)
    return new THREE.Vector3(c.r, c.g, c.b)
  }

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    camera.position.z = 1

    const geometry = new THREE.PlaneGeometry(2, 2)

    const uniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() },
      lineWidth: { value: lineWidth },
      rippleCount: { value: rippleCount },
      colorLayers: { value: colorLayers },
      rotation: { value: rotationRadians },
      timeScale: { value: timeScale },
      opacity: { value: opacity },
      waveIntensity: { value: waveIntensity },
      scale: { value: scale },
      color1: { value: colorToVec3(color1) },
      color2: { value: colorToVec3(color2) },
      color3: { value: colorToVec3(color3) },
      loopDuration: { value: loopDuration },
      modValue: { value: mod },
    }

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        #define PI 3.14159265359

        uniform vec2 resolution;
        uniform float time;
        uniform float lineWidth;
        uniform int rippleCount;
        uniform int colorLayers;
        uniform float rotation;
        uniform float timeScale;
        uniform float opacity;
        uniform float waveIntensity;
        uniform float scale;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        uniform float loopDuration;
        uniform float modValue;

        vec2 rotate(vec2 v, float a) {
          float s = sin(a);
          float c = cos(a);
          return mat2(c, -s, s, c) * v;
        }

        float ease(float t) {
          return t < 0.5
            ? 4.0 * t * t * t
            : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy)
            / min(resolution.x, resolution.y);

          uv /= scale;
          uv = rotate(uv, rotation);

          uv.x += sin(uv.y * 5.0 + time * timeScale * 0.1) * waveIntensity;
          uv.y += cos(uv.x * 5.0 + time * timeScale * 0.1) * waveIntensity;

          float t = mod(time * timeScale * 0.05, loopDuration);
          float fade = ease(sin((t / loopDuration) * PI));

          vec3 col = vec3(0.0);
          float total = 0.0;

          for (int j = 0; j < 3; j++) {
            if (j >= colorLayers) break;

            vec3 c = j == 0 ? color1 : j == 1 ? color2 : color3;

            float layer = 0.0;
            for (int i = 0; i < 12; i++) {
              if (i >= rippleCount) break;
              float r = fract(t + float(i) * 0.01);
              float radius = r * r * 8.0;
              layer += lineWidth * float(i * i)
                / abs(radius - length(uv) + mod(uv.x + uv.y, modValue));
            }

            col += c * layer;
            total += layer;
          }

          if (total > 0.0) col /= max(total * 0.3, 1.0);

          gl_FragColor = vec4(col * fade, min(total * 0.2, 1.0) * opacity * fade);
        }
      `,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      uniforms.resolution.value.set(
        renderer.domElement.width,
        renderer.domElement.height
      )
    }

    resize()
    window.addEventListener("resize", resize)

    const animate = () => {
      uniforms.time.value += speed * animationSpeed
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    window.removeEventListener("resize", resize)

    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement)
    }

    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
  }, [
    speed,
    lineWidth,
    rippleCount,
    colorLayers,
    rotationRadians,
    timeScale,
    opacity,
    waveIntensity,
    animationSpeed,
    loopDuration,
    scale,
    color1,
    color2,
    color3,
    mod,
  ])

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${className}`}
      style={{ background: backgroundColor }}
    />
  )
}
