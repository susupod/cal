import { Check, LoaderCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"

import { Button } from "@/components/ui/button"
import {
  formatCandidateDateLabel,
  formatTime,
  getRelativeDayLabel,
} from "@/lib/calendar-candidates"

export type ScheduleListItem = {
  id: string
  start: Date
  end: Date
  title?: string
}

type ScheduleListProps = {
  items: ScheduleListItem[]
  selectedId: string | null
  today: Date
  onSelect: (id: string) => void
  ariaLabel: string
  heading?: string
  emptyMessage: string
  scrollRootRef?: RefObject<HTMLElement | null>
  paginate?: boolean
}

const pageSize = 5

export function ScheduleList({
  items,
  selectedId,
  today,
  onSelect,
  ariaLabel,
  heading,
  emptyMessage,
  scrollRootRef,
  paginate = true,
}: ScheduleListProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [isLoading, setIsLoading] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const sortedItems = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  )
  const hasMore = paginate && visibleCount < sortedItems.length
  const itemGroups = groupItemsByDate(
    paginate ? sortedItems.slice(0, visibleCount) : sortedItems
  )

  useEffect(() => {
    const target = loadMoreRef.current
    if (target == null || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        setIsLoading(true)
        window.setTimeout(() => {
          setVisibleCount((count) => Math.min(count + pageSize, items.length))
          setIsLoading(false)
        }, 700)
      },
      { root: scrollRootRef?.current ?? null, rootMargin: "0px 0px 72px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, isLoading, items.length, scrollRootRef])

  return (
    <section aria-label={ariaLabel}>
      {heading != null && (
        <p className="tds-sub-typography-11 font-semibold">{heading}</p>
      )}
      {itemGroups.length === 0 ? (
        <p className="mt-2 tds-sub-typography-12 text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className={heading == null ? "space-y-4" : "mt-3 space-y-4"}>
          {itemGroups.map(({ date, items: itemsOnDate }) => (
            <section key={date.toISOString()}>
              <div className="flex items-center justify-between gap-2 tds-typography-7 font-medium">
                <span>{formatCandidateDateLabel(date)}</span>
                <span className="shrink-0 text-muted-foreground">
                  {getRelativeDayLabel(date, today)}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {itemsOnDate.map((item) => {
                  const isSelected = selectedId === item.id

                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-between rounded-lg bg-muted/40 px-3 py-2 text-left font-normal hover:bg-muted"
                      aria-pressed={isSelected}
                      onClick={() => onSelect(item.id)}
                    >
                      <span className="min-w-0">
                        {item.title != null && (
                          <span className="block truncate tds-sub-typography-11 font-medium">
                            {item.title}
                          </span>
                        )}
                        <span
                          className={
                            item.title == null
                              ? "block tds-sub-typography-11"
                              : "mt-0.5 block tds-sub-typography-12 text-muted-foreground"
                          }
                        >
                          {formatTime(item.start)} – {formatTime(item.end)}
                        </span>
                      </span>
                      {isSelected && (
                        <Check
                          className="ml-3 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                      )}
                    </Button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="mt-4 flex h-10 items-center justify-center gap-2 tds-sub-typography-12 text-muted-foreground"
          role="status"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="size-3 animate-spin" aria-hidden />
              목록을 불러오고 있어요
            </>
          ) : (
            "스크롤하면 더 불러와요"
          )}
        </div>
      )}
    </section>
  )
}

function groupItemsByDate(items: ScheduleListItem[]) {
  return [...items]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .reduce<Array<{ date: Date; items: ScheduleListItem[] }>>(
      (groups, item) => {
        const group = groups.at(-1)

        if (group?.date.toDateString() === item.start.toDateString()) {
          group.items.push(item)
        } else {
          groups.push({ date: item.start, items: [item] })
        }

        return groups
      },
      []
    )
}
