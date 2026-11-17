// Room stage settings. Hotspot boxes are percentages of the stage (0-100).
// Tune them after the real art is in place.

export const ROOM = {
  // Logical size of every layer image (all layers share it)
  width: 1280,
  height: 720,

  hotspots: {
    computer: { left: 31, top: 28, width: 31, height: 44 },
    bed: { left: 59, top: 67, width: 33, height: 30 },
  },
} as const

export type HotspotId = keyof typeof ROOM.hotspots