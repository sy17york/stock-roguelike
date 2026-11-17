// Room stage: stacked same-size transparent layers plus two clickable hotspots.
// Layer images are found by file name under src/assets/room/, so replacing a file
// with real art needs no code change.

import { useState } from 'react'
import { ACCESSORIES, FURNITURE_IDS } from '../../config/decorations'
import type { Accessory } from '../../config/decorations'
import { ROOM } from '../../config/room'
import type { HotspotId } from '../../config/room'
import { useT } from '../../i18n/useT'
import { useGame } from '../../state/useGame'
import styles from './Room.module.css'

const files = import.meta.glob('../../assets/room/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function imageUrl(relativePath: string): string | undefined {
  return files[`../../assets/room/${relativePath}`]
}

const accessoryFile = (a: Accessory) => `accessory/${a.group}_${a.id}.png`

interface RoomProps {
  onComputer: () => void
  onBed: () => void
}

export function Room({ onComputer, onBed }: RoomProps) {
  const { state } = useGame()
  const { t } = useT()
  const [hover, setHover] = useState<HotspotId | null>(null)
  const { variants, accessories } = state.run.decor

  const active = ACCESSORIES.filter((a) => accessories.includes(a.id))
  const belowFurniture = active.filter((a) => a.group === 'floor')
  const aboveFurniture = active.filter((a) => a.group !== 'floor')

  // Bottom to top. The closed (old) wardrobe is the outermost layer so it hides its accessories.
  const layers: string[] = [
    'bg/room.png',
    ...belowFurniture.map(accessoryFile),
    ...FURNITURE_IDS.filter((f) => f !== 'wardrobe').flatMap((f) =>
      variants[f] === 'new' ? [`furniture/${f}_old.png`, `furniture/${f}_new.png`] : [`furniture/${f}_old.png`],
    ),
    ...(variants.wardrobe === 'new' ? ['furniture/wardrobe_new.png'] : []),
    ...aboveFurniture.map(accessoryFile),
    ...(variants.wardrobe === 'old' ? ['furniture/wardrobe_old.png'] : []),
  ]

  const hotspots: { id: HotspotId; onClick: () => void; label: string }[] = [
    { id: 'computer', onClick: onComputer, label: t('room.computer') },
    { id: 'bed', onClick: onBed, label: t('room.bed') },
  ]

  return (
    <div className={styles.stage}>
      {layers.map((path) => {
        const src = imageUrl(path)
        return src ? <img key={path} className={styles.layer} src={src} alt="" draggable={false} /> : null
      })}

      {hotspots.map(({ id, onClick, label }) => {
        const box = ROOM.hotspots[id]
        return (
          <div key={id}>
            <button
              className={styles.hotspot}
              style={{
                left: `${box.left}%`,
                top: `${box.top}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
              aria-label={label}
              onClick={onClick}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(id)}
              onBlur={() => setHover(null)}
            />
            {hover === id && (
              <div
                className={styles.tooltip}
                style={{ left: `${box.left + box.width / 2}%`, top: `${box.top}%` }}
              >
                {label}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}