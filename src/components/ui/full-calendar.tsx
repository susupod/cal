"use client"

import { Button } from "@/components/ui/button"
import {
  getPreviewLayoutFromSlot,
  layoutOverlappingEvents,
} from "@/lib/calendar-layout"
import type { CalendarLayout } from "@/lib/calendar-layout"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  getMonth,
  isSameDay,
  isSameMonth,
  setHours,
  setMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import type { Locale } from "date-fns"
import { enUS } from "date-fns/locale/en-US"
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { CSSProperties, ReactNode } from "react"
import { Check, TriangleAlert } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"

type CalendarEventColorMode = "source" | "neutral"

type CalendarColor =
  | "default"
  | "grey"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "teal"
  | "yellow"

const eventColorClassNames: Record<
  NonNullable<CalendarEvent["color"]>,
  string
> = {
  default: "tds-event-grey",
  grey: "tds-event-grey",
  blue: "tds-event-blue",
  green: "tds-event-green",
  orange: "tds-event-orange",
  red: "tds-event-red",
  purple: "tds-event-purple",
  teal: "tds-event-teal",
  yellow: "tds-event-yellow",
}

const dayEventVariants = cva(
  "box-border flex flex-col items-start justify-start overflow-hidden rounded-lg border-0 bg-[var(--event-fill)] p-2 pl-4 text-left tds-sub-typography-12 text-[var(--event-text)]",
  {
    variants: {
      semantic: {
        busy: "font-medium",
        candidate: "font-medium",
      },
    },
    defaultVariants: {
      semantic: "busy",
    },
  }
)

type View = "day" | "week" | "month" | "year"

const defaultBusinessHours: CalendarBusinessHours[] = [0, 1, 2, 3, 4, 5, 6].map(
  (dayOfWeek) => ({
    dayOfWeek,
    enabled: ![0, 6].includes(dayOfWeek),
    start: "09:00",
    end: "18:00",
  })
)

type ContextType = {
  view: View
  setView: (view: View) => void
  date: Date
  setDate: (date: Date) => void
  events: CalendarEvent[]
  availabilityRanges: CalendarAvailabilityRange[]
  locale: Locale
  setEvents: (date: CalendarEvent[]) => void
  onChangeView?: (view: View) => void
  onEventClick?: (event: CalendarEvent) => void
  selectedEventId?: string | null
  onAvailabilitySelect?: (slot: CalendarAvailabilitySlot) => void
  resolveAvailabilitySlot: (
    slot: CalendarAvailabilitySlot
  ) => CalendarAvailabilitySlot
  enableHotkeys?: boolean
  today: Date
  selectionTitle: string
  selectionDurationMinutes: number
  selectedAvailabilitySlot: CalendarAvailabilitySlot | null
  selectionEnabled: boolean
  selectionPreviewEnabled: boolean
  selectionStyle: "default" | "draft"
  eventSelectionEnabled: boolean
  disabledEventIds: string[]
  eventColorMode: CalendarEventColorMode
  showEvents: boolean
  focusedAvailabilityRangeId: string | null
  setFocusedAvailabilityRangeId: (id: string | null) => void
  businessHours: CalendarBusinessHours[]
  avoidTimes: CalendarAvoidTime[]
}

const Context = createContext<ContextType>({} as ContextType)

export type CalendarEvent = {
  id: string
  start: Date
  end: Date
  title: string
  color?: CalendarColor
  kind?: "busy" | "candidate"
  icon?: string
  avatars?: string[]
  attendeeNames?: string[]
  isTemporary?: boolean
}

export type CalendarEventState =
  | "default"
  | "hovered"
  | "selected"
  | "conflicted"

export type CalendarEventCardProps = {
  event: CalendarEvent
  state?: CalendarEventState
  disabled?: boolean
  dimmed?: boolean
  onClick?: () => void
  style?: CSSProperties
}

export type CalendarAvailabilityRange = {
  id: string
  start: Date
  end: Date
  title: string
  color?: Extract<CalendarColor, "blue" | "green" | "orange" | "yellow">
  availableCount: number
  totalCount: number
  availableParticipantNames?: string[]
  durationMinutes?: number
}

export type CalendarAvailabilitySlot = {
  range?: CalendarAvailabilityRange
  start: Date
  end: Date
  blocked: boolean
  recommended: boolean
  unavailableParticipantNames?: string[]
  constraintMessages?: string[]
}

export type CalendarBusinessHours = {
  dayOfWeek: number
  enabled: boolean
  start: string
  end: string
}

export type CalendarAvoidTime = {
  id: string
  start: Date
  end: Date
  title: string
}

type CalendarProps = {
  children: ReactNode
  defaultDate?: Date
  today?: Date
  events?: CalendarEvent[]
  availabilityRanges?: CalendarAvailabilityRange[]
  view?: View
  locale?: Locale
  enableHotkeys?: boolean
  responsiveView?: boolean
  onChangeView?: (view: View) => void
  onEventClick?: (event: CalendarEvent) => void
  selectedEventId?: string | null
  onAvailabilitySelect?: (slot: CalendarAvailabilitySlot) => void
  resolveAvailabilitySlot?: (
    slot: CalendarAvailabilitySlot
  ) => CalendarAvailabilitySlot
  selectedAvailabilitySlot?: CalendarAvailabilitySlot | null
  selectionEnabled?: boolean
  selectionPreviewEnabled?: boolean
  selectionStyle?: "default" | "draft"
  eventSelectionEnabled?: boolean
  disabledEventIds?: string[]
  eventColorMode?: CalendarEventColorMode
  showEvents?: boolean
  selectionTitle?: string
  selectionDurationMinutes?: number
  businessHours?: CalendarBusinessHours[]
  avoidTimes?: CalendarAvoidTime[]
}

const Calendar = ({
  children,
  defaultDate = new Date(),
  today = defaultDate,
  locale = enUS,
  enableHotkeys = true,
  responsiveView = true,
  view: _defaultMode = "month",
  selectionTitle = "새 일정",
  selectionDurationMinutes = 60,
  businessHours = defaultBusinessHours,
  avoidTimes = [],
  selectedAvailabilitySlot = null,
  selectionEnabled = true,
  selectionPreviewEnabled = true,
  selectionStyle = "default",
  eventSelectionEnabled = true,
  disabledEventIds = [],
  eventColorMode = "source",
  showEvents = true,
  onEventClick,
  selectedEventId = null,
  onAvailabilitySelect,
  resolveAvailabilitySlot = (slot) => slot,
  events: defaultEvents = [],
  availabilityRanges = [],
  onChangeView,
}: CalendarProps) => {
  const [view, setView] = useState<View>(_defaultMode)
  const [date, setDate] = useState(defaultDate)
  const events = defaultEvents
  const setEvents = useCallback(() => undefined, [])
  const [focusedAvailabilityRangeId, setFocusedAvailabilityRangeId] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (!responsiveView) {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)")
    const syncMobileView = () => {
      if (mediaQuery.matches) {
        setView("day")
        onChangeView?.("day")
      }
    }

    syncMobileView()
    mediaQuery.addEventListener("change", syncMobileView)

    return () => mediaQuery.removeEventListener("change", syncMobileView)
  }, [onChangeView, responsiveView])

  const changeView = (view: View) => {
    setView(view)
    onChangeView?.(view)
  }

  useHotkeys("m", () => changeView("month"), {
    enabled: enableHotkeys,
  })

  useHotkeys("w", () => changeView("week"), {
    enabled: enableHotkeys,
  })

  useHotkeys("y", () => changeView("year"), {
    enabled: enableHotkeys,
  })

  useHotkeys("d", () => changeView("day"), {
    enabled: enableHotkeys,
  })

  return (
    <Context.Provider
      value={{
        view,
        setView,
        date,
        setDate,
        events,
        availabilityRanges,
        setEvents,
        locale,
        enableHotkeys,
        onEventClick,
        selectedEventId,
        onAvailabilitySelect,
        resolveAvailabilitySlot,
        onChangeView,
        today,
        selectionTitle,
        selectionDurationMinutes,
        selectedAvailabilitySlot,
        selectionEnabled,
        selectionPreviewEnabled,
        selectionStyle,
        eventSelectionEnabled,
        disabledEventIds,
        eventColorMode,
        showEvents,
        focusedAvailabilityRangeId,
        setFocusedAvailabilityRangeId,
        businessHours,
        avoidTimes,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useCalendar = () => useContext(Context)

const CalendarViewTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & {
    view: View
  }
>(({ children, view, className, ...props }) => {
  const { view: currentView, setView, onChangeView } = useCalendar()

  return (
    <Button
      aria-current={currentView === view}
      size="sm"
      variant="ghost"
      className={cn(className, currentView === view && "bg-background")}
      {...props}
      onClick={() => {
        setView(view)
        onChangeView?.(view)
      }}
    >
      {children}
    </Button>
  )
})
CalendarViewTrigger.displayName = "CalendarViewTrigger"

const DayEventsLayer = ({
  day,
  events,
  hoveredSlot,
}: {
  day: Date
  events: CalendarEvent[]
  hoveredSlot: CalendarAvailabilitySlot | null
}) => {
  const {
    onEventClick,
    selectedEventId,
    eventColorMode,
    eventSelectionEnabled,
    disabledEventIds,
  } = useCalendar()
  const dayEvents = layoutOverlappingEvents(
    events
      .filter((event) => isSameDay(event.start, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  )

  return (
    <div className="absolute inset-x-0 top-0">
      {dayEvents.map(
        ({ event, leftPercent, widthPercent, offsetPx, zIndex }) => {
          const rawTop =
            (event.start.getHours() + event.start.getMinutes() / 60) * 80
          const rawHeight =
            (differenceInMinutes(event.end, event.start) / 60) * 80
          const top = rawTop + 4
          const height = Math.max(24, rawHeight - 8)
          const isOverlappedBySelection =
            hoveredSlot != null &&
            event.start < hoveredSlot.end &&
            event.end > hoveredSlot.start
          const isDimmed = disabledEventIds.includes(event.id)

          return (
            <CalendarEventCard
              key={event.id}
              event={{
                ...event,
                color: getEventDisplayColor(event.color, eventColorMode),
              }}
              disabled={!eventSelectionEnabled || isDimmed}
              dimmed={isDimmed}
              onClick={() => onEventClick?.(event)}
              state={
                event.id === selectedEventId
                  ? "selected"
                  : isOverlappedBySelection
                    ? "conflicted"
                    : "default"
              }
              style={{
                top,
                height,
                left:
                  leftPercent == null
                    ? `calc(${offsetPx}px + 4px)`
                    : `calc(${leftPercent}% + 4px)`,
                width:
                  widthPercent == null
                    ? `calc(100% - ${offsetPx}px - 8px)`
                    : `calc(${widthPercent}% - 8px)`,
                zIndex: 35 + zIndex,
              }}
            />
          )
        }
      )}
    </div>
  )
}

export const getEventDisplayColor = (
  color: CalendarEvent["color"],
  mode: CalendarEventColorMode
) => (mode === "neutral" ? "grey" : color)

const CalendarEventCard = ({
  event,
  state = "default",
  disabled = false,
  dimmed = false,
  onClick,
  style,
}: CalendarEventCardProps) => {
  return (
    <button
      type="button"
      aria-label={event.title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute text-left disabled:pointer-events-none disabled:cursor-default",
        eventColorClassNames[event.color ?? "default"],
        dayEventVariants({ semantic: event.kind ?? "busy" }),
        state === "hovered" && "ring-2 ring-ring/50",
        state === "selected" &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
        state === "conflicted" && "opacity-55 saturate-75",
        dimmed && "opacity-45 saturate-75"
      )}
      style={style}
    >
      <EventContent event={event} />
    </button>
  )
}

const AvailabilityLayer = ({
  day,
  ranges,
  busyEvents,
  hoveredSlot,
  selectedSlot,
  onHoveredSlotChange,
}: {
  day: Date
  ranges: CalendarAvailabilityRange[]
  busyEvents: CalendarEvent[]
  hoveredSlot: CalendarAvailabilitySlot | null
  selectedSlot: CalendarAvailabilitySlot | null
  onHoveredSlotChange: (slot: CalendarAvailabilitySlot | null) => void
}) => {
  const {
    onAvailabilitySelect,
    selectionTitle,
    selectionDurationMinutes,
    selectionEnabled,
    selectionPreviewEnabled,
    selectionStyle,
    resolveAvailabilitySlot,
    focusedAvailabilityRangeId,
  } = useCalendar()
  const [lockedSlot, setLockedSlot] = useState<CalendarAvailabilitySlot | null>(
    null
  )
  const dayRanges = ranges
    .filter((range) => isSameDay(range.start, day))
    .flatMap((range) => subtractBusyEventsFromRange(range, busyEvents))
  const getPreviewLayout = (slot: CalendarAvailabilitySlot | null) =>
    slot == null
      ? null
      : getPreviewLayoutFromSlot(
          busyEvents.filter((event) => isSameDay(event.start, day)),
          slot
        )
  const selectedPreviewLayout = getPreviewLayout(selectedSlot)
  const hoveredPreviewLayout = getPreviewLayout(hoveredSlot)
  const getResolvedSlot = (element: HTMLElement, clientY: number) =>
    resolveAvailabilitySlot(
      getSlotFromPointer(
        element,
        clientY,
        day,
        busyEvents,
        dayRanges,
        selectionDurationMinutes
      )
    )

  return (
    <div className="absolute inset-x-0 top-0">
      {dayRanges.map((range) => {
        const isHoveredRange =
          hoveredSlot != null &&
          range.start < hoveredSlot.end &&
          range.end > hoveredSlot.start

        return (
          <CalendarAvailabilityRangeCard
            key={range.id}
            range={range}
            dimmed={isHoveredRange}
            className={cn(
              "pointer-events-none absolute inset-x-1",
              range.id === focusedAvailabilityRangeId &&
                "ring-2 ring-[var(--availability-line)] ring-offset-2 ring-offset-background"
            )}
            style={getAbsoluteRangeStyle(range.start, range.end)}
          />
        )
      })}
      {(selectionEnabled || selectionPreviewEnabled) && (
        <button
          type="button"
          aria-label={selectionEnabled ? "시간 선택" : "시간 미리보기"}
          aria-disabled={!selectionEnabled}
          tabIndex={selectionEnabled ? 0 : -1}
          className={cn(
            "absolute inset-x-0 top-0 z-30 h-[1920px] bg-transparent",
            selectionEnabled ? "cursor-pointer" : "cursor-default"
          )}
          onMouseMove={(mouseEvent) => {
            if (!selectionPreviewEnabled || lockedSlot != null) {
              return
            }

            onHoveredSlotChange(
              getResolvedSlot(mouseEvent.currentTarget, mouseEvent.clientY)
            )
          }}
          onPointerDown={(pointerEvent) => {
            if (!selectionEnabled || pointerEvent.pointerType === "mouse") {
              return
            }

            const nextSlot = getResolvedSlot(
              pointerEvent.currentTarget,
              pointerEvent.clientY
            )
            setLockedSlot(nextSlot)
            onHoveredSlotChange(nextSlot)
          }}
          onMouseLeave={() => {
            if (lockedSlot == null) {
              onHoveredSlotChange(null)
            }
          }}
          onClick={(mouseEvent) => {
            if (!selectionEnabled) {
              return
            }

            const nextSlot = getResolvedSlot(
              mouseEvent.currentTarget,
              mouseEvent.clientY
            )

            if (isCoarsePointer()) {
              if (lockedSlot != null && isSameSlot(lockedSlot, nextSlot)) {
                onAvailabilitySelect?.(resolveAvailabilitySlot(nextSlot))
                setLockedSlot(null)
                onHoveredSlotChange(null)
                return
              }

              setLockedSlot(nextSlot)
              onHoveredSlotChange(nextSlot)
              return
            }

            onAvailabilitySelect?.(resolveAvailabilitySlot(nextSlot))
            onHoveredSlotChange(null)
          }}
        >
          {selectedSlot != null && (
            <CalendarSelectionPreviewCard
              slot={selectedSlot}
              title={selectionTitle}
              draft={false}
              className="pointer-events-none absolute inset-x-1"
              style={{
                ...getAbsoluteRangeStyle(selectedSlot.start, selectedSlot.end),
                ...getLayoutPositionStyle(selectedPreviewLayout),
                zIndex: 50,
              }}
            />
          )}
          {hoveredSlot != null &&
            (selectedSlot == null ||
              !isSameSlot(hoveredSlot, selectedSlot)) && (
              <CalendarSelectionPreviewCard
                slot={hoveredSlot}
                title={selectionTitle}
                draft={selectionStyle === "draft"}
                className="pointer-events-none absolute inset-x-1"
                style={{
                  ...getAbsoluteRangeStyle(hoveredSlot.start, hoveredSlot.end),
                  ...getLayoutPositionStyle(hoveredPreviewLayout),
                  zIndex: 60,
                }}
              />
            )}
        </button>
      )}
    </div>
  )
}

const getLayoutPositionStyle = (layout: CalendarLayout | null) => {
  if (layout == null) {
    return {}
  }

  return {
    left:
      layout.leftPercent == null
        ? `calc(${layout.offsetPx}px + 4px)`
        : `calc(${layout.leftPercent}% + 4px)`,
    width:
      layout.widthPercent == null
        ? `calc(100% - ${layout.offsetPx}px - 8px)`
        : `calc(${layout.widthPercent}% - 8px)`,
  }
}

export const subtractBusyEventsFromRange = (
  range: CalendarAvailabilityRange,
  busyEvents: CalendarEvent[]
) => {
  const durationMinutes = range.durationMinutes ?? 60
  const overlaps = busyEvents
    .filter((event) => event.start < range.end && event.end > range.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  const segments: CalendarAvailabilityRange[] = []
  let cursor = new Date(range.start)

  for (const event of overlaps) {
    const segmentEnd = event.start < range.end ? event.start : range.end
    if (differenceInMinutes(segmentEnd, cursor) >= durationMinutes) {
      segments.push({
        ...range,
        id: `${range.id}-${segments.length}`,
        title: range.title.replace(/ · .+$/, ""),
        start: new Date(cursor),
        end: new Date(segmentEnd),
      })
    }

    if (event.end > cursor) {
      cursor = event.end < range.end ? new Date(event.end) : new Date(range.end)
    }
  }

  if (differenceInMinutes(range.end, cursor) >= durationMinutes) {
    segments.push({
      ...range,
      id: `${range.id}-${segments.length}`,
      title: range.title.replace(/ · .+$/, ""),
      start: new Date(cursor),
      end: new Date(range.end),
    })
  }

  return segments
}

const getSlotFromPointer = (
  element: HTMLElement,
  clientY: number,
  day: Date,
  busyEvents: CalendarEvent[],
  ranges: CalendarAvailabilityRange[],
  durationMinutes: number
) => {
  const rect = element.getBoundingClientRect()
  const y = clientY - rect.top

  return getSlotFromDay(
    day,
    y / rect.height,
    busyEvents,
    ranges,
    durationMinutes
  )
}

const isCoarsePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches

const isSameSlot = (a: CalendarAvailabilitySlot, b: CalendarAvailabilitySlot) =>
  a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime()

const getSlotFromDay = (
  day: Date,
  yRatio: number,
  busyEvents: CalendarEvent[],
  ranges: CalendarAvailabilityRange[],
  durationMinutes: number
): CalendarAvailabilitySlot => {
  const rawMinutes = Math.min(
    24 * 60 - durationMinutes,
    Math.max(0, yRatio * 24 * 60)
  )
  const snappedMinutes = Math.floor(rawMinutes / 15) * 15
  const start = new Date(day)
  start.setHours(0, snappedMinutes, 0, 0)
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + durationMinutes)
  const blocked = busyEvents.some(
    (event) => start < event.end && end > event.start
  )
  const range = ranges.find(
    (candidate) => start >= candidate.start && end <= candidate.end
  )

  return {
    range,
    start,
    end,
    blocked,
    recommended: range != null,
  }
}

const getAbsoluteRangeStyle = (start: Date, end: Date) => {
  const top = (start.getHours() + start.getMinutes() / 60) * 80 + 4
  const height = Math.max(24, (differenceInMinutes(end, start) / 60) * 80 - 8)

  return { top, height }
}

const getAbsoluteTimeStateStyle = (start: Date, end: Date) => ({
  top: (start.getHours() + start.getMinutes() / 60) * 80,
  height: (differenceInMinutes(end, start) / 60) * 80,
})

const getOutsideBusinessHourRanges = (
  day: Date,
  businessHours: CalendarBusinessHours[]
): Array<{ start: Date; end: Date }> => {
  const rule = businessHours.find((item) => item.dayOfWeek === day.getDay())
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = addDays(dayStart, 1)

  if (rule == null || !rule.enabled) {
    return [{ start: dayStart, end: dayEnd }]
  }

  const workStart = getDateAtTime(dayStart, rule.start)
  const workEnd = getDateAtTime(dayStart, rule.end)
  const ranges: Array<{ start: Date; end: Date }> = []

  if (workStart > dayStart) {
    ranges.push({ start: dayStart, end: workStart })
  }

  if (workEnd < dayEnd) {
    ranges.push({ start: workEnd, end: dayEnd })
  }

  return ranges
}

const getDateAtTime = (day: Date, time: string) => {
  const [hour, minute] = time.split(":").map(Number)
  const result = new Date(day)

  if (hour === 24) {
    return addDays(result, 1)
  }

  result.setHours(hour, minute, 0, 0)
  return result
}

const ScheduleContent = ({
  start,
  end,
  title,
}: {
  start: Date
  end: Date
  title: string
}) => {
  const isTiny = differenceInMinutes(end, start) < 40

  return (
    <span className="relative z-10 flex h-full w-full min-w-0 flex-col items-start">
      <span
        className={cn(
          "block w-full truncate text-left font-semibold text-current",
          isTiny ? "tds-sub-typography-12" : "tds-typography-7"
        )}
      >
        {title}
      </span>
      {!isTiny && (
        <span className="block w-full truncate tds-sub-typography-12 font-normal text-current opacity-80">
          {format(start, "HH:mm")} - {format(end, "HH:mm")}
        </span>
      )}
    </span>
  )
}

export function CalendarAvailabilityRangeCard({
  range,
  dimmed = false,
  className,
  style,
}: {
  range: CalendarAvailabilityRange
  dimmed?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        "calendar-availability box-border flex flex-col items-start justify-start rounded-xl border border-dashed border-[var(--availability-line)] bg-[var(--availability-fill)] p-2 text-left text-[var(--availability-text)]",
        eventColorClassNames[range.color ?? "blue"],
        className
      )}
      style={style}
    >
      <span
        className={cn(
          "relative z-10 flex w-full min-w-0 flex-col items-start justify-start transition-opacity",
          dimmed && "opacity-25"
        )}
      >
        <span className="flex w-full min-w-0 items-center gap-1 tds-sub-typography-12 font-semibold opacity-80">
          <span
            aria-hidden
            className="grid size-3 shrink-0 place-items-center rounded-full bg-[var(--availability-text)] text-background"
          >
            <Check className="size-2" strokeWidth={3} />
          </span>
          <span className="truncate">
            {format(range.start, "HH:mm")} - {format(range.end, "HH:mm")}
          </span>
        </span>
      </span>
    </div>
  )
}

export function CalendarSelectionPreviewCard({
  slot,
  title,
  className,
  style,
  preview = "selected",
  draft = false,
}: {
  slot: CalendarAvailabilitySlot
  title: string
  className?: string
  style?: CSSProperties
  preview?: "hover" | "selected"
  draft?: boolean
}) {
  const CandidateIcon = slot.blocked
    ? TriangleAlert
    : slot.recommended
      ? Check
      : null

  return (
    <span
      className={cn(
        "box-border flex flex-col items-start justify-start rounded-xl border border-[var(--selection-border)] bg-[var(--selection-fill)] p-2 pr-7 pl-4 text-left text-[var(--selection-text)] shadow-[0_4px_12px_var(--selection-shadow)] backdrop-blur-[1px]",
        "before:absolute before:top-2 before:bottom-2 before:left-1.5 before:w-1 before:rounded-full before:bg-[var(--selection-line)]",
        slot.recommended
          ? "calendar-selection-recommended"
          : "calendar-selection-default",
        slot.blocked && "calendar-selection-overlap",
        draft &&
          "border-dashed border-primary bg-primary/5 text-foreground shadow-none before:hidden",
        className
      )}
      style={style}
    >
      {draft ? (
        <span className="relative z-10 tds-sub-typography-12 font-medium text-current">
          {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
        </span>
      ) : preview === "hover" ? (
        <span className="relative z-10 flex flex-col gap-0.5 tds-sub-typography-12 font-semibold text-current">
          <span>{slot.blocked ? "충돌 있음" : "추천 가능"}</span>
          <span className="font-normal opacity-80">
            {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
          </span>
        </span>
      ) : (
        <ScheduleContent start={slot.start} end={slot.end} title={title} />
      )}
      {!draft && CandidateIcon != null && (
        <CandidateIcon
          aria-hidden
          className="absolute right-2 bottom-2 z-20 size-3.5 text-[var(--selection-text)]"
        />
      )}
    </span>
  )
}

const EventContent = ({ event }: { event: CalendarEvent }) => {
  return (
    <>
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-1.5 w-1 rounded-full bg-[var(--event-line)]"
      />
      <ScheduleContent
        start={event.start}
        end={event.end}
        title={event.title}
      />
    </>
  )
}

const CalendarDayView = () => {
  const {
    view,
    events,
    date,
    availabilityRanges,
    today,
    selectedAvailabilitySlot,
    showEvents,
    businessHours,
  } = useCalendar()
  const [hoveredSlot, setHoveredSlot] =
    useState<CalendarAvailabilitySlot | null>(null)
  const didInitialScrollRef = useRef(false)

  useEffect(() => {
    if (view === "day" && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true
      requestAnimationFrame(() =>
        scrollTimeToTop(
          getInitialScrollDate(
            date,
            today,
            businessHours,
            events,
            availabilityRanges
          )
        )
      )
    }
  }, [availabilityRanges, businessHours, date, events, today, view])

  if (view !== "day") return null

  const hours = [...Array(24)].map((_, i) => setHours(date, i))
  const visibleSlot = hoveredSlot ?? selectedAvailabilitySlot

  return (
    <div
      data-calendar-scroll
      className="relative h-full [scrollbar-width:none] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      <div
        data-calendar-scroll-content
        className="relative grid grid-cols-[3rem_minmax(0,1fr)] [--time-gutter-inset:--spacing(1)]"
      >
        <CurrentTimeLine />
        <TimeTable />
        <div className="relative min-w-0 border-l tds-sub-typography-11 text-muted-foreground">
          {hours.map((hour) => (
            <div
              key={hour.toString()}
              className="h-20 border-t first:border-t-0 last:border-b"
            />
          ))}
          <AvailabilityLayer
            day={date}
            ranges={availabilityRanges}
            busyEvents={events.filter((event) => event.kind !== "candidate")}
            hoveredSlot={
              isSameDay(hoveredSlot?.start ?? new Date(0), date)
                ? hoveredSlot
                : null
            }
            selectedSlot={
              isSameDay(selectedAvailabilitySlot?.start ?? new Date(0), date)
                ? selectedAvailabilitySlot
                : null
            }
            onHoveredSlotChange={setHoveredSlot}
          />
          {showEvents && (
            <DayEventsLayer
              day={date}
              events={events}
              hoveredSlot={
                isSameDay(visibleSlot?.start ?? new Date(0), date)
                  ? visibleSlot
                  : null
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

const CalendarTimeStateLayer = ({ day }: { day: Date }) => {
  const { avoidTimes, businessHours } = useCalendar()
  const outsideBusinessHourRanges = getOutsideBusinessHourRanges(
    day,
    businessHours
  )
  const dayAvoidTimes = avoidTimes.filter((range) =>
    isSameDay(range.start, day)
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[1920px]">
      {outsideBusinessHourRanges.map((range) => (
        <span
          key={`outside-business-hours-${range.start.toISOString()}`}
          aria-label="업무 시간 외"
          className="calendar-hatch-business absolute inset-x-0"
          style={getAbsoluteTimeStateStyle(range.start, range.end)}
        />
      ))}
      {dayAvoidTimes.map((range) => (
        <span
          key={range.id}
          aria-label={`비선호 시간: ${range.title}`}
          className="calendar-hatch-business absolute inset-x-0"
          style={getAbsoluteTimeStateStyle(range.start, range.end)}
        />
      ))}
    </div>
  )
}

const CalendarWeekView = () => {
  const {
    view,
    date,
    setDate,
    locale,
    events,
    availabilityRanges,
    today,
    selectedAvailabilitySlot,
    showEvents,
    focusedAvailabilityRangeId,
    setFocusedAvailabilityRangeId,
    businessHours,
  } = useCalendar()
  const [hoveredSlot, setHoveredSlot] =
    useState<CalendarAvailabilitySlot | null>(null)
  const didInitialScrollRef = useRef(false)

  const weekDates = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 0 })
    const weekDates = []

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i)
      const hours = [...Array(24)].map((_, i) => setHours(day, i))
      weekDates.push(hours)
    }

    return weekDates
  }, [date])

  const headerDays = useMemo(() => {
    const daysOfWeek = []
    for (let i = 0; i < 7; i++) {
      const result = addDays(startOfWeek(date, { weekStartsOn: 0 }), i)
      daysOfWeek.push(result)
    }
    return daysOfWeek
  }, [date])

  const focusedAvailabilityRange = useMemo(() => {
    if (focusedAvailabilityRangeId == null) {
      return null
    }

    return (
      availabilityRanges.find(
        (range) => range.id === focusedAvailabilityRangeId
      ) ??
      weekDates
        .flatMap((hours) => {
          const day = hours[0]
          const busyEvents = events.filter(
            (event) => event.kind !== "candidate" && isSameDay(event.start, day)
          )
          return availabilityRanges
            .filter((range) => isSameDay(range.start, day))
            .flatMap((range) => subtractBusyEventsFromRange(range, busyEvents))
        })
        .find((range) => range.id === focusedAvailabilityRangeId) ?? null
    )
  }, [availabilityRanges, events, focusedAvailabilityRangeId, weekDates])

  useEffect(() => {
    if (view !== "week") {
      return
    }

    if (focusedAvailabilityRange != null) {
      requestAnimationFrame(() =>
        scrollTimeToFocus(focusedAvailabilityRange.start)
      )
      const timeoutId = window.setTimeout(
        () => setFocusedAvailabilityRangeId(null),
        1200
      )
      return () => window.clearTimeout(timeoutId)
    }

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true
      requestAnimationFrame(() =>
        scrollTimeToTop(
          getInitialScrollDate(
            date,
            today,
            businessHours,
            events,
            availabilityRanges
          )
        )
      )
    }
  }, [
    availabilityRanges,
    businessHours,
    date,
    events,
    focusedAvailabilityRange,
    setFocusedAvailabilityRangeId,
    today,
    view,
    weekDates,
  ])

  if (view !== "week") return null

  const visibleSlot = hoveredSlot ?? selectedAvailabilitySlot

  return (
    <div
      data-calendar-scroll
      className="relative h-full [scrollbar-width:none] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      <div className="sticky top-0 z-[1000] grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b bg-background/80 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div />
        {headerDays.map((day, i) => (
          <Button
            key={day.toString()}
            type="button"
            variant="ghost"
            size="icon"
            className="group !h-7 !w-full !rounded-none !p-0 hover:!bg-transparent"
            onClick={() => setDate(day)}
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-md tds-sub-typography-11 text-muted-foreground group-hover:bg-muted",
                [0, 6].includes(i) && "text-muted-foreground/50",
                isSameDay(day, date) && "text-primary",
                isSameDay(day, today) &&
                  "bg-primary !text-primary-foreground group-hover:bg-primary"
              )}
            >
              {format(day, "E", { locale })}
            </span>
          </Button>
        ))}
      </div>
      <div
        data-calendar-scroll-content
        className="relative grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] [--time-gutter-inset:--spacing(1)]"
      >
        <CurrentTimeLine />
        <TimeTable />
        {weekDates.map((hours, i) => {
          return (
            <div
              className={cn(
                "relative min-w-0 border-l tds-sub-typography-11 text-muted-foreground",
                [0, 6].includes(i) && "bg-[var(--calendar-dim-fill)]"
              )}
              key={hours[0].toString()}
            >
              {hours.map((hour) => (
                <div
                  key={hour.toString()}
                  className="h-20 border-t first:border-t-0 last:border-b"
                />
              ))}
              <CalendarTimeStateLayer day={hours[0]} />
              <AvailabilityLayer
                day={hours[0]}
                ranges={availabilityRanges}
                busyEvents={events.filter(
                  (event) => event.kind !== "candidate"
                )}
                hoveredSlot={
                  isSameDay(hoveredSlot?.start ?? new Date(0), hours[0])
                    ? hoveredSlot
                    : null
                }
                selectedSlot={
                  isSameDay(
                    selectedAvailabilitySlot?.start ?? new Date(0),
                    hours[0]
                  )
                    ? selectedAvailabilitySlot
                    : null
                }
                onHoveredSlotChange={setHoveredSlot}
              />
              {showEvents && (
                <DayEventsLayer
                  day={hours[0]}
                  events={events}
                  hoveredSlot={
                    isSameDay(visibleSlot?.start ?? new Date(0), hours[0])
                      ? visibleSlot
                      : null
                  }
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CalendarMonthView = () => {
  const {
    date,
    view,
    locale,
    today,
    availabilityRanges,
    events,
    setDate,
    setView,
    onChangeView,
    setFocusedAvailabilityRangeId,
  } = useCalendar()

  const monthDates = useMemo(() => getDaysInMonth(date), [date])
  const weekDays = useMemo(() => generateWeekdays(locale), [locale])

  if (view !== "month") return null

  return (
    <div
      data-calendar-scroll
      className="relative h-full [scrollbar-width:none] overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      <div className="sticky top-0 z-[1000] grid grid-cols-7 border-b bg-background/80 py-3 shadow-xs backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={cn(
              "flex items-center justify-center text-center tds-typography-7 font-medium text-muted-foreground",
              [0, 6].includes(i) && "text-muted-foreground/50"
            )}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="-mt-px grid auto-rows-[7rem] grid-cols-7 gap-px bg-border p-px md:auto-rows-[8rem]">
        {monthDates.map((_date) => {
          const busyEvents = events.filter(
            (event) =>
              event.kind !== "candidate" && isSameDay(event.start, _date)
          )
          const dayRanges = availabilityRanges
            .filter((range) => isSameDay(range.start, _date))
            .flatMap((range) => subtractBusyEventsFromRange(range, busyEvents))
            .sort((a, b) => a.start.getTime() - b.start.getTime())
          const isCurrentMonth = isSameMonth(date, _date)
          const visibleRanges = isCurrentMonth ? dayRanges : []
          const visibleMonthRanges = visibleRanges.slice(0, 2)
          const hiddenRangeCount = Math.max(
            0,
            visibleRanges.length - visibleMonthRanges.length
          )

          const openRangeInWeek = (range: CalendarAvailabilityRange) => {
            setDate(range.start)
            setFocusedAvailabilityRangeId(range.id)
            setView("week")
            onChangeView?.("week")
          }

          return (
            <div
              key={_date.toString()}
              className={cn(
                "flex flex-col items-start gap-2 bg-background p-2 text-left",
                isCurrentMonth &&
                  [0, 6].includes(_date.getDay()) &&
                  "bg-[var(--calendar-dim-fill)]",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full tds-typography-7 font-semibold",
                  isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground/60",
                  isSameDay(_date, today) &&
                    "bg-primary text-primary-foreground"
                )}
              >
                {format(_date, "d")}
              </span>
              {visibleMonthRanges.length > 0 && (
                <span className="mt-auto flex w-full min-w-0 flex-col gap-1">
                  {visibleMonthRanges.map((range, index) => {
                    const slotEnd = addMinutes(
                      range.start,
                      range.durationMinutes ?? 60
                    )
                    const colorClassName =
                      eventColorClassNames[range.color ?? "green"]

                    return (
                      <button
                        key={range.id}
                        type="button"
                        onClick={() => openRangeInWeek(range)}
                        className={cn(
                          "calendar-availability flex w-full min-w-0 items-center gap-1 rounded-lg border border-dashed border-[var(--availability-line)] bg-[var(--availability-fill)] px-2 py-1.5 text-left tds-sub-typography-12 font-semibold text-[var(--availability-text)] hover:bg-[var(--availability-fill)]",
                          colorClassName
                        )}
                      >
                        <span
                          aria-hidden
                          className="grid size-3 shrink-0 place-items-center rounded-full bg-[var(--availability-text)] text-background"
                        >
                          <Check className="size-2" strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {format(range.start, "HH:mm")} -{" "}
                          {format(slotEnd, "HH:mm")}
                        </span>
                        {index === visibleMonthRanges.length - 1 &&
                          hiddenRangeCount > 0 && (
                            <span className="shrink-0">
                              +{hiddenRangeCount}
                            </span>
                          )}
                      </button>
                    )
                  })}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CalendarYearView = () => {
  const { view, date, today, locale } = useCalendar()

  const months = useMemo(() => {
    if (!view) {
      return []
    }

    return Array.from({ length: 12 }).map((_, i) => {
      return getDaysInMonth(setMonth(date, i))
    })
  }, [date, view])

  const weekDays = useMemo(() => generateWeekdays(locale), [locale])

  if (view !== "year") return null

  return (
    <div className="grid h-full grid-cols-4 gap-10 overflow-auto">
      {months.map((days, i) => (
        <div key={days[0].toString()}>
          <span className="tds-typography-4">{i + 1}</span>

          <div className="my-5 grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center tds-sub-typography-12 text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-x-2 text-center tds-sub-typography-12 tabular-nums">
            {days.map((_date) => {
              return (
                <div
                  key={_date.toString()}
                  className={cn(
                    getMonth(_date) !== i && "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "grid aspect-square size-full place-content-center tabular-nums",
                      isSameDay(today, _date) &&
                        getMonth(_date) === i &&
                        "rounded-full bg-primary text-primary-foreground"
                    )}
                  >
                    {format(_date, "d")}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const CalendarNextTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { date, setDate, view, enableHotkeys } = useCalendar()

  const next = useCallback(() => {
    if (view === "day") {
      setDate(addDays(date, 1))
    } else if (view === "week") {
      setDate(addWeeks(date, 1))
    } else if (view === "month") {
      setDate(addMonths(date, 1))
    } else if (view === "year") {
      setDate(addYears(date, 1))
    }
  }, [date, view, setDate])

  useHotkeys("ArrowRight", () => next(), {
    enabled: enableHotkeys,
  })

  return (
    <Button
      size="icon"
      variant="ghost"
      ref={ref}
      {...props}
      onClick={(e) => {
        next()
        onClick?.(e)
      }}
    >
      {children}
    </Button>
  )
})
CalendarNextTrigger.displayName = "CalendarNextTrigger"

const CalendarPrevTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { date, setDate, view, enableHotkeys } = useCalendar()

  useHotkeys("ArrowLeft", () => prev(), {
    enabled: enableHotkeys,
  })

  const prev = useCallback(() => {
    if (view === "day") {
      setDate(subDays(date, 1))
    } else if (view === "week") {
      setDate(subWeeks(date, 1))
    } else if (view === "month") {
      setDate(subMonths(date, 1))
    } else if (view === "year") {
      setDate(subYears(date, 1))
    }
  }, [date, view, setDate])

  return (
    <Button
      size="icon"
      variant="ghost"
      ref={ref}
      {...props}
      onClick={(e) => {
        prev()
        onClick?.(e)
      }}
    >
      {children}
    </Button>
  )
})
CalendarPrevTrigger.displayName = "CalendarPrevTrigger"

const CalendarTodayTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { setDate, enableHotkeys, today } = useCalendar()

  useHotkeys("t", () => jumpToToday(), {
    enabled: enableHotkeys,
  })

  const jumpToToday = useCallback(() => {
    setDate(today)
    requestAnimationFrame(() => scrollCurrentTimeToCenter(today))
  }, [today, setDate])

  return (
    <Button
      variant="ghost"
      ref={ref}
      {...props}
      onClick={(e) => {
        jumpToToday()
        onClick?.(e)
      }}
    >
      {children}
    </Button>
  )
})
CalendarTodayTrigger.displayName = "CalendarTodayTrigger"

const CalendarCurrentDate = () => {
  const { date, view } = useCalendar()
  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const weekEnd = addDays(weekStart, 6)
  const label =
    view === "day"
      ? format(date, "yyyy년 M월 d일")
      : view === "week"
        ? formatWeekRange(weekStart, weekEnd)
        : format(date, "yyyy년 M월")

  return (
    <time dateTime={date.toISOString()} className="tabular-nums">
      {label}
    </time>
  )
}

export const getCurrentTimeTop = (now: Date) => {
  return (now.getHours() + now.getMinutes() / 60) * 80
}

export const getCurrentTimeLineStyle = (weekdayIndex: number) => ({
  left: `calc(${(weekdayIndex / 7) * 100}% + ${(1 - weekdayIndex / 7) * 3}rem)`,
  width: "calc((100% - 3rem) / 7)",
})

const scrollCurrentTimeToCenter = (time: Date) => {
  const viewport = document.querySelector<HTMLElement>("[data-calendar-scroll]")
  if (viewport == null) {
    return
  }

  viewport.scrollTo({
    top: Math.max(0, getCurrentTimeTop(time) - viewport.clientHeight / 2),
    behavior: "smooth",
  })
}

const scrollTimeToTop = (date: Date) => {
  const viewport = document.querySelector<HTMLElement>("[data-calendar-scroll]")
  if (viewport == null) {
    return
  }

  const top = (date.getHours() + date.getMinutes() / 60) * 80
  viewport.scrollTo({
    top: Math.max(0, top - 80),
    behavior: "smooth",
  })
}

const scrollTimeToFocus = (date: Date) => {
  const viewport = document.querySelector<HTMLElement>("[data-calendar-scroll]")
  if (viewport == null) {
    return
  }

  const top = (date.getHours() + date.getMinutes() / 60) * 80
  viewport.scrollTo({
    top: Math.max(0, top - viewport.clientHeight * 0.3),
    behavior: "smooth",
  })
}

const getDefaultScrollDate = (
  date: Date,
  businessHours: CalendarBusinessHours[]
) => {
  const startMinutes = businessHours
    .filter((rule) => rule.enabled && rule.start !== "00:00")
    .map((rule) => {
      const [hour, minute] = rule.start.split(":").map(Number)
      return hour * 60 + minute
    })
  const minutes = startMinutes.length > 0 ? Math.min(...startMinutes) : 9 * 60
  const next = new Date(date)

  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return next
}

const getInitialScrollDate = (
  date: Date,
  today: Date,
  businessHours: CalendarBusinessHours[],
  events: CalendarEvent[],
  availabilityRanges: CalendarAvailabilityRange[]
) => {
  const fallback = getDefaultScrollDate(date, businessHours)
  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const weekEnd = addDays(weekStart, 7)
  const earliestAvailability = availabilityRanges
    .filter((range) => range.start >= weekStart && range.start < weekEnd)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]

  if (earliestAvailability != null) {
    return earliestAvailability.start
  }

  const isCurrentWeek =
    startOfWeek(date, { weekStartsOn: 0 }).getTime() ===
    startOfWeek(today, { weekStartsOn: 0 }).getTime()

  if (!isCurrentWeek) {
    return fallback
  }

  const todayHours = businessHours.filter(
    (rule) => rule.enabled && rule.dayOfWeek === today.getDay()
  )
  if (todayHours.length === 0) {
    return fallback
  }

  const getMinutes = (time: string) => {
    const [hour, minute] = time.split(":").map(Number)
    return hour * 60 + minute
  }
  const startMinutes = Math.min(
    ...todayHours.map((rule) => getMinutes(rule.start))
  )
  const endMinutes = Math.max(...todayHours.map((rule) => getMinutes(rule.end)))
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  if (nowMinutes < startMinutes) {
    const start = new Date(today)
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
    return start
  }

  if (nowMinutes <= endMinutes) {
    return today
  }

  return (
    [...events, ...availabilityRanges]
      .map((item) => item.start)
      .filter((start) => start >= today)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? fallback
  )
}

const formatWeekRange = (start: Date, end: Date) => {
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${format(start, "yyyy년 M월 d일")}–${format(end, "d일")}`
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "yyyy년 M월 d일")}–${format(end, "M월 d일")}`
  }

  return `${format(start, "yyyy년 M월 d일")}–${format(end, "yyyy년 M월 d일")}`
}

const CurrentTimeLine = () => {
  const { date, today } = useCalendar()
  const top = getCurrentTimeTop(today)
  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 })

  if (weekStart.getTime() !== todayWeekStart.getTime()) {
    return null
  }

  const weekdayIndex = differenceInCalendarDays(today, weekStart)

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20"
      style={{ top }}
    >
      <time
        dateTime={format(today, "HH:mm")}
        className="absolute top-1/2 left-0 w-12 -translate-y-1/2 rounded-r-md bg-destructive py-px pr-(--time-gutter-inset) text-right tds-sub-typography-13 font-normal text-destructive-foreground tabular-nums"
      >
        {format(today, "HH:mm")}
      </time>
      <span
        aria-hidden
        className="absolute right-0 left-12 h-px bg-destructive/25"
      />
      <span
        aria-hidden
        className="absolute h-[2px] bg-destructive"
        style={getCurrentTimeLineStyle(weekdayIndex)}
      />
    </div>
  )
}

const TimeTable = () => {
  return (
    <div className="w-12 pr-(--time-gutter-inset)">
      {Array.from(Array(25).keys()).map((hour) => {
        return (
          <div
            className="relative h-20 text-right tds-sub-typography-13 text-muted-foreground/50 tabular-nums last:h-0"
            key={hour}
          >
            <p className="top-0 -translate-y-1/2">
              {String(hour === 24 ? 0 : hour).padStart(2, "0")}:00
            </p>
          </div>
        )
      })}
    </div>
  )
}

const getDaysInMonth = (date: Date) => {
  const startOfMonthDate = startOfMonth(date)
  const startOfWeekForMonth = startOfWeek(startOfMonthDate, {
    weekStartsOn: 0,
  })

  let currentDate = startOfWeekForMonth
  const calendar = []

  while (calendar.length < 42) {
    calendar.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }

  return calendar
}

const generateWeekdays = (locale: Locale) => {
  const daysOfWeek = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i)
    daysOfWeek.push(format(date, "EEEEEE", { locale }))
  }
  return daysOfWeek
}

export {
  Calendar,
  CalendarCurrentDate,
  CalendarEventCard,
  CalendarDayView,
  CalendarMonthView,
  CalendarNextTrigger,
  CalendarPrevTrigger,
  CalendarTodayTrigger,
  CalendarViewTrigger,
  CalendarWeekView,
  CalendarYearView,
}
