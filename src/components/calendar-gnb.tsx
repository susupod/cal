import { ChevronLeft, ChevronRight, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  CalendarCurrentDate,
  CalendarNextTrigger,
  CalendarPrevTrigger,
  CalendarTodayTrigger,
} from "@/components/ui/full-calendar"

export type CalendarGnbMode = "calendar" | "creating" | "scheduling"

type CalendarGnbProps = {
  mode: CalendarGnbMode
  onBack: () => void
  onCreate: () => void
  onOpenSettings: () => void
}

export function CalendarGnb({
  mode,
  onBack,
  onCreate,
  onOpenSettings,
}: CalendarGnbProps) {
  const title = {
    calendar: "내 일정",
    creating: "일정 만들기",
    scheduling: "시간 선택",
  }[mode]

  return (
    <header className="flex h-14 shrink-0 border-b">
      <div className="flex w-[18rem] shrink-0 items-center border-r px-4">
        {mode !== "calendar" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-2 mr-1"
            aria-label="일정 보기로 돌아가기"
            onClick={onBack}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <h1 className="tds-sub-typography-10 font-semibold">{title}</h1>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <CalendarPrevTrigger aria-label="이전 주">
            <ChevronLeft className="size-4" />
          </CalendarPrevTrigger>
          <h2 className="min-w-48 text-center tds-sub-typography-10 font-semibold">
            <CalendarCurrentDate />
          </h2>
          <CalendarNextTrigger aria-label="다음 주">
            <ChevronRight className="size-4" />
          </CalendarNextTrigger>
          <CalendarTodayTrigger className="ml-2">오늘</CalendarTodayTrigger>
        </div>
        <div className="flex items-center gap-2">
          {mode === "calendar" && (
            <Button type="button" onClick={onCreate}>
              일정 만들기
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="업무 시간 설정"
            onClick={onOpenSettings}
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
