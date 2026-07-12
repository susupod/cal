import { describe, expect, it } from 'vitest'

import {
  getPreviewLayoutFromSlot,
  layoutOverlappingEvents,
  previewEventId,
} from './calendar-layout'

const at = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return new Date(2026, 6, 7, hour, minute)
}

const event = (id: string, start: string, end: string) => ({
  id,
  start: at(start),
  end: at(end),
})

const slot = (start: string, end: string) => ({
  start: at(start),
  end: at(end),
  recommended: false,
  blocked: false,
})

describe('layoutOverlappingEvents', () => {
  it('cascades two overlapping events by line-width offset', () => {
    const layouts = layoutOverlappingEvents([
      event('a', '10:00', '10:45'),
      event('b', '10:30', '11:30'),
    ])

    expect(layouts.find((layout) => layout.event.id === 'a')).toMatchObject({ offsetPx: 0 })
    expect(layouts.find((layout) => layout.event.id === 'b')).toMatchObject({ offsetPx: 6 })
  })

  it('splits dense overlaps using stable final lane count', () => {
    const layouts = layoutOverlappingEvents([
      event('a', '10:00', '10:45'),
      event('b', '10:30', '11:30'),
      event('c', '10:35', '11:00'),
    ])

    for (const layout of layouts) {
      expect(layout.widthPercent).toBeCloseTo(32.333, 3)
    }
    expect(layouts[0]?.leftPercent).toBe(0)
    expect(layouts[1]?.leftPercent).toBeCloseTo(33.333, 3)
    expect(layouts[2]?.leftPercent).toBeCloseTo(66.666, 2)
  })
})

describe('getPreviewLayoutFromSlot', () => {
  it('indents preview when it overlaps an event that starts before it', () => {
    const layout = getPreviewLayoutFromSlot(
      [event('busy', '10:00', '10:45')],
      slot('10:30', '11:30')
    )

    expect(layout).toMatchObject({ event: { id: previewEventId }, offsetPx: 12 })
  })

  it('indents preview even when it overlaps by only 15 minutes', () => {
    const layout = getPreviewLayoutFromSlot(
      [event('busy', '09:30', '10:15')],
      slot('10:00', '11:00')
    )

    expect(layout).toMatchObject({ event: { id: previewEventId }, offsetPx: 12 })
  })

  it('indents preview when it overlaps an event that starts after it', () => {
    const layout = getPreviewLayoutFromSlot(
      [event('busy', '10:30', '11:30')],
      slot('10:00', '11:00')
    )

    expect(layout).toMatchObject({ event: { id: previewEventId }, offsetPx: 12 })
  })

  it('keeps preview at half width when it touches multiple existing events', () => {
    const layout = getPreviewLayoutFromSlot(
      [event('top', '10:00', '10:30'), event('bottom', '11:00', '11:30')],
      slot('10:15', '11:15')
    )

    expect(layout?.event.id).toBe(previewEventId)
    expect(layout?.leftPercent).toBe(50)
    expect(layout?.widthPercent).toBe(49)
  })
})
