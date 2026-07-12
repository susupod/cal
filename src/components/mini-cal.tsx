import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { ko } from "date-fns/locale"
import { useMemo } from "react"

import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

type MiniCalProps = {
  className?: string
  month: Date
  onMonthChange: (month: Date) => void
  today?: Date
  selectedDate?: Date
  onSelect: (date: Date | undefined) => void
  showSelectedWeek?: boolean
  eventDates?: Date[]
  candidateDates?: Date[]
  showHeader?: boolean
}

export function MiniCal({
  className,
  month,
  onMonthChange,
  today,
  selectedDate,
  onSelect,
  showSelectedWeek = true,
  eventDates = [],
  candidateDates = [],
  showHeader = true,
}: MiniCalProps) {
  const selectedWeekModifiers = useMemo(() => {
    if (!showSelectedWeek || selectedDate == null) {
      return {
        selectedWeek: [],
        selectedWeekFirstDay: [],
        selectedWeekLastDay: [],
      }
    }

    const start = startOfWeek(selectedDate)
    const end = endOfWeek(selectedDate)

    return {
      selectedWeek: eachDayOfInterval({ start, end }),
      selectedWeekFirstDay: [start],
      selectedWeekLastDay: [end],
    }
  }, [selectedDate, showSelectedWeek])

  return (
    <Calendar
      mode="single"
      locale={ko}
      month={month}
      onMonthChange={onMonthChange}
      today={today}
      selected={selectedDate}
      onSelect={onSelect}
      modifiers={{
        ...selectedWeekModifiers,
        event: eventDates,
        candidate: candidateDates,
      }}
      modifiersClassNames={{
        selectedWeek: "bg-muted/70 text-foreground",
        selectedWeekFirstDay: "rounded-l-lg",
        selectedWeekLastDay: "rounded-r-lg",
      }}
      classNames={{
        ...(showHeader ? {} : { nav: "hidden", month_caption: "hidden" }),
        day: "group/day relative aspect-square h-full w-full rounded-none p-0 text-center select-none",
        today: "font-bold",
      }}
      className={cn("w-full", className)}
    />
  )
}
