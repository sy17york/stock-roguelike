// One canvas: main chart (candles + overlays) with up to 3 sub charts stacked below it.
// All areas share the same horizontal candle positions; each area has its own vertical scale.
// A vertical crosshair runs through every area. Legends are HTML laid over the canvas.

import { useEffect, useRef, useState } from 'react'
import { priceRange, sliceVisible } from '../../../core/chart'
import type { ChartLayers, IndicatorResult } from '../../../core/indicators'
import type { Candle } from '../../../core/types'
import type { TextKey } from '../../../i18n'
import { useT } from '../../../i18n/useT'
import styles from './CandleChart.module.css'

interface CandleChartProps {
  candles: Candle[] // the visible window
  layers: ChartLayers
  zoom: { onIn: () => void; onOut: () => void; canIn: boolean; canOut: boolean }
}

// ---------- Geometry (shared by drawing, hit-testing and legends) ----------

const PAD = { left: 6, right: 58, top: 8, bottom: 8 }
const MAIN_H = 300
const SUB_H = 90
const GAP = 10

const subTop = (i: number) => PAD.top + MAIN_H + GAP * (i + 1) + SUB_H * i

function layout(width: number, subCount: number, candleCount: number) {
  const plotW = width - PAD.left - PAD.right
  const bottom = subCount > 0 ? subTop(subCount - 1) + SUB_H : PAD.top + MAIN_H
  return {
    plotW,
    step: plotW / Math.max(candleCount, 1),
    right: PAD.left + plotW,
    bottom,
    height: bottom + PAD.bottom,
  }
}

type Layout = ReturnType<typeof layout>

interface Colors {
  up: string
  down: string
  grid: string
  muted: string
  accent: string
}

const fmtAxis = (v: number) => (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2))

// ---------- Drawing ----------

function strokeSeries(
  ctx: CanvasRenderingContext2D,
  values: (number | null)[],
  xOf: (i: number) => number,
  toY: (v: number) => number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  let pen = false
  values.forEach((v, i) => {
    if (v === null) {
      pen = false // gap: do not connect across missing values
      return
    }
    if (pen) ctx.lineTo(xOf(i), toY(v))
    else {
      ctx.moveTo(xOf(i), toY(v))
      pen = true
    }
  })
  ctx.stroke()
  ctx.lineWidth = 1
}

function dashedH(ctx: CanvasRenderingContext2D, y: number, x1: number, x2: number, color: string) {
  ctx.strokeStyle = color
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawMain(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  candles: Candle[],
  overlays: IndicatorResult[],
  c: Colors,
) {
  const range = priceRange(candles)
  const toY = (p: number) => PAD.top + ((range.max - p) / (range.max - range.min)) * MAIN_H
  const xOf = (i: number) => PAD.left + (i + 0.5) * L.step

  // Grid and price labels
  ctx.font = '11px monospace'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const price = range.max - ((range.max - range.min) * i) / 4
    const y = Math.round(toY(price)) + 0.5
    ctx.globalAlpha = 0.35
    ctx.strokeStyle = c.grid
    ctx.beginPath()
    ctx.moveTo(PAD.left, y)
    ctx.lineTo(L.right, y)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = c.muted
    ctx.fillText(price.toFixed(2), L.right + 6, y)
  }

  // Everything below is clipped to the main chart, so lines far outside the range are cut off
  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD.left, PAD.top, L.plotW, MAIN_H)
  ctx.clip()

  const bodyW = Math.max(1, Math.floor(L.step * 0.7))
  candles.forEach((k, i) => {
    ctx.fillStyle = k.close >= k.open ? c.up : c.down
    const cx = xOf(i)
    const yHigh = Math.round(toY(k.high))
    const yLow = Math.round(toY(k.low))
    ctx.fillRect(Math.floor(cx), yHigh, 1, Math.max(1, yLow - yHigh))
    const yTop = Math.round(toY(Math.max(k.open, k.close)))
    const yBottom = Math.round(toY(Math.min(k.open, k.close)))
    ctx.fillRect(Math.floor(cx - bodyW / 2), yTop, bodyW, Math.max(1, yBottom - yTop))
  })

  for (const overlay of overlays) {
    for (const line of overlay.lines) strokeSeries(ctx, sliceVisible(line.values, candles.length), xOf, toY, line.color)
  }
  ctx.restore()

  // Support / resistance levels, with the price on the axis
  for (const overlay of overlays) {
    for (const level of overlay.levels ?? []) {
      const y = Math.round(toY(level.price)) + 0.5
      const color = level.kind === 'resistance' ? '#e07070' : '#70c0e0'
      dashedH(ctx, y, PAD.left, L.right, color)
      ctx.fillStyle = color
      ctx.fillText(level.price.toFixed(2), L.right + 6, y)
    }
  }
}

function drawSub(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  index: number,
  result: IndicatorResult,
  candles: Candle[],
  c: Colors,
) {
  const top = subTop(index)
  const series = result.lines.map((line) => ({ line, values: sliceVisible(line.values, candles.length) }))
  const hasVolume = result.lines.some((l) => l.style === 'volume')
  const hasBars = result.lines.some((l) => l.style === 'bar' || l.style === 'volume')

  // Own vertical scale from this indicator's data (plus its reference lines)
  const nums: number[] = [...(result.guides ?? [])]
  for (const s of series) for (const v of s.values) if (v !== null) nums.push(v)
  if (hasBars) nums.push(0)
  if (nums.length === 0) return
  let min = Math.min(...nums)
  let max = Math.max(...nums)
  if (max === min) {
    max += 1
    min -= 1
  }
  const pad = (max - min) * 0.05
  max += pad
  if (!hasVolume) min -= pad
  const toY = (v: number) => top + ((max - v) / (max - min)) * SUB_H
  const xOf = (i: number) => PAD.left + (i + 0.5) * L.step

  // Frame
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = c.grid
  ctx.strokeRect(PAD.left + 0.5, top + 0.5, L.plotW, SUB_H)
  ctx.globalAlpha = 1

  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD.left, top, L.plotW, SUB_H)
  ctx.clip()

  for (const g of result.guides ?? []) dashedH(ctx, Math.round(toY(g)) + 0.5, PAD.left, L.right, c.grid)

  const bodyW = Math.max(1, Math.floor(L.step * 0.7))
  const zero = Math.min(Math.max(toY(0), top), top + SUB_H)
  for (const { line, values } of series) {
    if (line.style === 'bar' || line.style === 'volume') {
      values.forEach((v, i) => {
        if (v === null) return
        const y = toY(v)
        const up = line.style === 'volume' ? candles[i].close >= candles[i].open : v >= 0
        ctx.fillStyle = up ? c.up : c.down
        const y0 = Math.min(y, zero)
        ctx.fillRect(Math.floor(xOf(i) - bodyW / 2), Math.round(y0), bodyW, Math.max(1, Math.round(Math.abs(y - zero))))
      })
    } else {
      strokeSeries(ctx, values, xOf, toY, line.color)
    }
  }
  ctx.restore()

  // Only the highest and lowest value on the axis. OBV has no meaningful numbers, so none.
  if (result.id !== 'obv') {
    ctx.font = '11px monospace'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = c.muted
    ctx.fillText(fmtAxis(max), L.right + 6, top + 6)
    ctx.fillText(fmtAxis(min), L.right + 6, top + SUB_H - 6)
  }
}

function draw(
  canvas: HTMLCanvasElement,
  candles: Candle[],
  layers: ChartLayers,
  hover: number | null,
) {
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const ctx = canvas.getContext('2d')
  if (!ctx || w === 0 || h === 0 || candles.length === 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const css = getComputedStyle(canvas)
  const colors: Colors = {
    up: css.getPropertyValue('--color-up').trim(),
    down: css.getPropertyValue('--color-down').trim(),
    grid: css.getPropertyValue('--color-border-dim').trim(),
    muted: css.getPropertyValue('--color-muted').trim(),
    accent: css.getPropertyValue('--color-accent').trim(),
  }

  const L = layout(w, layers.subs.length, candles.length)
  drawMain(ctx, L, candles, layers.overlays, colors)
  layers.subs.forEach((s, i) => drawSub(ctx, L, i, s, candles, colors))

  // Vertical crosshair through every area (no horizontal line)
  if (hover !== null && hover >= 0 && hover < candles.length) {
    const x = Math.floor(PAD.left + (hover + 0.5) * L.step) + 0.5
    ctx.strokeStyle = colors.muted
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, PAD.top)
    ctx.lineTo(x, L.bottom)
    ctx.stroke()
  }
}

// ---------- Component ----------

export function CandleChart({ candles, layers, zoom }: CandleChartProps) {
  const { t, number } = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const subCount = layers.subs.length
  const height = layout(0, subCount, 0).height

  // Redraw when the canvas is resized
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, candles, layers, hover)
  }, [candles, layers, hover, size])

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const el = canvasRef.current
    if (!el) return
    const L = layout(el.clientWidth, subCount, candles.length)
    const x = e.clientX - el.getBoundingClientRect().left - PAD.left
    const index = Math.floor(x / L.step)
    setHover(index >= 0 && index < candles.length ? index : null)
  }

  // Legends show the hovered day, or today when not hovering
  const idx = hover ?? candles.length - 1
  const shown = candles[idx]
  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? '-' : Math.abs(v) >= 1000 ? number(v, 0) : number(v, 2)

  const legendItem = (r: IndicatorResult) => (
    <span key={r.id} className={styles.item}>
      <b>{t(`talent.${r.id}.name` as TextKey)}</b>
      {r.id !== 'obv' &&
        r.lines.map((l) => (
          <span key={l.key}>
            <i className={styles.swatch} style={{ background: l.color }} />
            {fmt(sliceVisible(l.values, candles.length)[idx])}
          </span>
        ))}
    </span>
  )

  const noLayers = layers.overlays.length === 0 && subCount === 0

  return (
    <div>
      <div className={styles.wrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ height }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />

        <div className={styles.zoom}>
          <button className="btn" disabled={!zoom.canOut} onClick={zoom.onOut} aria-label="zoom out">
            −
          </button>
          <button className="btn" disabled={!zoom.canIn} onClick={zoom.onIn} aria-label="zoom in">
            +
          </button>
        </div>

        <div className={styles.mainLegend}>
          {shown && (
            <div className={styles.row}>
              <span>{t('chart.open')} {number(shown.open)}</span>
              <span>{t('chart.high')} {number(shown.high)}</span>
              <span>{t('chart.low')} {number(shown.low)}</span>
              <span>{t('chart.close')} {number(shown.close)}</span>
            </div>
          )}
          {layers.overlays.length > 0 && <div className={styles.row}>{layers.overlays.map(legendItem)}</div>}
        </div>

        {layers.subs.map((r, i) => (
          <div key={r.id} className={styles.subLegend} style={{ top: subTop(i) + 3 }}>
            {legendItem(r)}
          </div>
        ))}
      </div>
      {noLayers && <p className={styles.hint}>{t('chart.indicatorsEmpty')}</p>}
    </div>
  )
}