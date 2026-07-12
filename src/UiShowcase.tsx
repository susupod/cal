import { addDays, startOfMonth } from "date-fns"
import { ko } from "date-fns/locale"
import { useState } from "react"

import {
  AttendeePicker,
  type Attendee,
  type AttendeePickerUser,
} from "@/components/attendee-picker"
import { MiniCal } from "@/components/mini-cal"
import { ScheduleCancelDialog } from "@/components/schedule-cancel-dialog"
import {
  ScheduleForm,
  type ScheduleFormValue,
} from "@/components/schedule-form"
import { ScheduleReview } from "@/components/schedule-review"
import {
  CandidateFilters,
  type CandidateRules,
} from "@/components/candidate-filters"
import {
  UpcomingEventFilters,
  type UpcomingEventFilter,
} from "@/components/upcoming-event-filters"
import { ScheduleList } from "@/components/schedule-list"
import { CalendarGnb, type CalendarGnbMode } from "@/components/calendar-gnb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Calendar as WeekCalendar,
  CalendarAvailabilityRangeCard,
  CalendarEventCard,
  CalendarSelectionPreviewCard,
  CalendarWeekView,
} from "@/components/ui/full-calendar"
import type {
  CalendarAvailabilityRange,
  CalendarAvailabilitySlot,
  CalendarAvoidTime,
  CalendarBusinessHours,
  CalendarEvent,
  CalendarEventState,
} from "@/components/ui/full-calendar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const today = new Date(2026, 6, 8)
type CalendarPreset =
  | "default"
  | "selected-date"
  | "selected-week"
  | "today-selected"
type WeekCalendarPreset =
  | "default"
  | "outside-business-hours"
  | "avoid-times"
  | "combined"
type ScheduleReviewPreset = "empty" | "all-available" | "unavailable"
type EventShowcaseTab = "event" | "availability" | "preview"
type PreviewState = "recommended" | "manual" | "blocked"
type ShowcaseDataTab = "event" | "candidate"

const componentSections = [
  {
    id: "schedule-form",
    name: "Schedule Form",
    children: [
      { id: "attendee-picker", name: "Attendee Picker" },
      { id: "schedule-review", name: "Schedule Review" },
      { id: "schedule-cancel-dialog", name: "Dialog" },
    ],
  },
  { id: "mini-calendar", name: "Mini Calendar" },
  {
    id: "week-calendar",
    name: "Week Calendar",
    children: [
      { id: "calendar-gnb", name: "Calendar GNB" },
      { id: "event", name: "Event" },
      { id: "filters", name: "Filter" },
      { id: "lists", name: "List" },
    ],
  },
]

const showcaseUsers: AttendeePickerUser[] = [
  {
    id: "seoyeon-kim",
    name: "김서연",
    email: "seoyeon.kim@example.com",
    avatar: `${import.meta.env.BASE_URL}profiles/001.png`,
  },
  {
    id: "junho-lee",
    name: "이준호",
    email: "junho.lee@example.com",
    avatar: `${import.meta.env.BASE_URL}profiles/002.png`,
  },
  {
    id: "minji-park",
    name: "박민지",
    email: "minji.park@example.com",
    avatar: `${import.meta.env.BASE_URL}profiles/003.png`,
  },
  {
    id: "hyunwoo-choi",
    name: "최현우",
    email: "hyunwoo.choi@example.com",
    avatar: `${import.meta.env.BASE_URL}profiles/004.png`,
  },
  {
    id: "daeun-jung",
    name: "정다은",
    email: "daeun.jung@example.com",
    avatar: `${import.meta.env.BASE_URL}profiles/005.png`,
  },
  {
    id: "jihoon-oh",
    name: "오지훈",
    email: "jihoon.oh@example.com",
    avatar: `${import.meta.env.BASE_URL}profiles/006.png`,
  },
]

const initialAttendees: Attendee[] = [
  { ...showcaseUsers[0], role: "required" },
  { ...showcaseUsers[4], role: "optional" },
]

const showcaseWeekEvents: CalendarEvent[] = [
  {
    id: "showcase-planning",
    start: new Date(2026, 6, 6, 10),
    end: new Date(2026, 6, 6, 11),
    title: "주간 계획",
    color: "grey",
  },
  {
    id: "showcase-design-review",
    start: new Date(2026, 6, 8, 14),
    end: new Date(2026, 6, 8, 15),
    title: "디자인 리뷰",
    color: "grey",
  },
]

const showcaseUpcomingEvents: CalendarEvent[] = [
  showcaseWeekEvents[1],
  {
    id: "showcase-personal",
    start: new Date(2026, 6, 10, 16),
    end: new Date(2026, 6, 10, 17),
    title: "개인 일정",
    color: "grey",
  },
]

const showcaseEventStates: Array<{
  label: string
  event: CalendarEvent
  state: CalendarEventState
  dimmed?: boolean
}> = [
  {
    label: "기본",
    event: { ...showcaseWeekEvents[0], kind: "busy" },
    state: "default",
  },
  {
    label: "선택됨",
    event: { ...showcaseWeekEvents[0], kind: "busy" },
    state: "selected",
  },
  {
    label: "필터 제외",
    event: {
      ...showcaseWeekEvents[0],
      id: "showcase-conflicted",
      kind: "busy",
    },
    state: "default",
    dimmed: true,
  },
]

const showcaseCandidateRules: CandidateRules = {
  attendeeMode: "all",
  selectedParticipantNames: [],
  requiredParticipantNames: [],
  businessHoursOnly: true,
  respectPreferences: true,
  roomAvailableOnly: true,
}

const showcaseAvailabilityRange: CalendarAvailabilityRange = {
  id: "showcase-available",
  title: "가능 시간",
  start: new Date(2026, 6, 8, 13),
  end: new Date(2026, 6, 8, 15),
  availableCount: 6,
  totalCount: 6,
  availableParticipantNames: showcaseUsers.map((user) => user.name),
  color: "green",
  durationMinutes: 60,
}

const showcasePreviewSlots: Record<PreviewState, CalendarAvailabilitySlot> = {
  recommended: {
    range: showcaseAvailabilityRange,
    start: new Date(2026, 6, 8, 13),
    end: new Date(2026, 6, 8, 14),
    blocked: false,
    recommended: true,
  },
  manual: {
    start: new Date(2026, 6, 8, 11),
    end: new Date(2026, 6, 8, 12),
    blocked: false,
    recommended: false,
  },
  blocked: {
    start: new Date(2026, 6, 8, 14),
    end: new Date(2026, 6, 8, 15),
    blocked: true,
    recommended: false,
  },
}

const showcaseAllDayBusinessHours: CalendarBusinessHours[] = Array.from(
  { length: 7 },
  (_, dayOfWeek) => ({
    dayOfWeek,
    enabled: true,
    start: "00:00",
    end: "24:00",
  })
)

const showcaseBusinessHours: CalendarBusinessHours[] = Array.from(
  { length: 7 },
  (_, dayOfWeek) => ({
    dayOfWeek,
    enabled: ![0, 6].includes(dayOfWeek),
    start: "09:00",
    end: "18:00",
  })
)

const showcaseAvoidTimes: CalendarAvoidTime[] = [
  {
    id: "showcase-avoid-focus",
    start: new Date(2026, 6, 8, 13),
    end: new Date(2026, 6, 8, 14),
    title: "집중 시간",
  },
  {
    id: "showcase-avoid-travel",
    start: new Date(2026, 6, 9, 16),
    end: new Date(2026, 6, 9, 17),
    title: "외근 이동",
  },
]

const presetLabels: Record<CalendarPreset, string> = {
  default: "기본",
  "selected-date": "날짜 선택",
  "selected-week": "주 선택",
  "today-selected": "오늘 선택",
}

const scheduleReviewPresetLabels: Record<ScheduleReviewPreset, string> = {
  empty: "선택 없음",
  "all-available": "전원 가능",
  unavailable: "참석 불가",
}

const eventShowcaseTabLabels: Record<EventShowcaseTab, string> = {
  event: "일정",
  availability: "가능 시간 범위",
  preview: "선택 미리보기",
}

const calendarGnbModeLabels: Record<CalendarGnbMode, string> = {
  calendar: "기본",
  creating: "일정 만들기",
  scheduling: "시간 선택",
}

const previewStateLabels: Record<PreviewState, string> = {
  recommended: "추천 가능",
  manual: "가능 시간 범위 밖",
  blocked: "기존 일정 충돌",
}

const weekPresetLabels: Record<WeekCalendarPreset, string> = {
  default: "기본",
  "outside-business-hours": "업무 시간 밖",
  "avoid-times": "비선호 시간",
  combined: "복합",
}

export function UiShowcase() {
  const [activeComponent, setActiveComponent] = useState("attendee-picker")
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees)
  const [scheduleFormValue, setScheduleFormValue] = useState<ScheduleFormValue>(
    {
      title: "디자인 방향성 리뷰",
      attendees: initialAttendees,
      durationMinutes: 60,
      room: "회의실 A",
    }
  )
  const [month, setMonth] = useState(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today)
  const [preset, setPreset] = useState<CalendarPreset>("default")
  const [weekPreset, setWeekPreset] = useState<WeekCalendarPreset>("default")
  const [scheduleReviewPreset, setScheduleReviewPreset] =
    useState<ScheduleReviewPreset>("empty")
  const [scheduleCancelDialogOpen, setScheduleCancelDialogOpen] =
    useState(false)
  const [eventShowcaseTab, setEventShowcaseTab] =
    useState<EventShowcaseTab>("event")
  const [candidateRules, setCandidateRules] = useState(showcaseCandidateRules)
  const [calendarGnbMode, setCalendarGnbMode] =
    useState<CalendarGnbMode>("calendar")
  const [upcomingEventFilter, setUpcomingEventFilter] =
    useState<UpcomingEventFilter>("all")
  const [selectedUpcomingEventId, setSelectedUpcomingEventId] = useState<
    string | null
  >(null)
  const [filterTab, setFilterTab] = useState<ShowcaseDataTab>("event")
  const visibleUpcomingEvents = showcaseUpcomingEvents.filter((event) => {
    if (upcomingEventFilter === "personal") return event.title === "개인 일정"
    if (upcomingEventFilter === "meeting") return event.title !== "개인 일정"
    return true
  })

  const showToday = preset === "today-selected"
  const selectDate = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date != null) setPreset("selected-date")
  }
  const applyPreset = (nextPreset: CalendarPreset) => {
    setPreset(nextPreset)

    if (nextPreset === "default") {
      setSelectedDate(undefined)
      setMonth(startOfMonth(today))
      return
    }

    if (nextPreset === "selected-date") {
      setSelectedDate(addDays(today, 2))
      setMonth(startOfMonth(today))
      return
    }

    if (nextPreset === "selected-week") {
      setSelectedDate(addDays(today, 3))
      setMonth(startOfMonth(today))
      return
    }

    setSelectedDate(today)
    setMonth(startOfMonth(today))
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>UI Showcase</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {componentSections.map((section) => (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      isActive={activeComponent === section.id}
                      onClick={() => setActiveComponent(section.id)}
                    >
                      {section.name}
                    </SidebarMenuButton>
                    {section.children != null && (
                      <SidebarMenuSub>
                        {section.children.map((child) => (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                              isActive={activeComponent === child.id}
                              onClick={() => setActiveComponent(child.id)}
                            >
                              {child.name}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center border-b px-4">
          <SidebarTrigger />
        </header>

        <main className="p-6">
          {activeComponent === "attendee-picker" && (
            <section
              id="attendee-picker"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">
                  Attendee Picker
                </h1>
              </div>

              <Card className="max-w-xl overflow-visible">
                <CardContent className="p-4">
                  <AttendeePicker
                    users={showcaseUsers}
                    value={attendees}
                    onValueChange={setAttendees}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {activeComponent === "schedule-review" && (
            <section
              id="schedule-review"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">
                  Schedule Review
                </h1>
              </div>

              <ToggleGroup
                type="single"
                value={scheduleReviewPreset}
                onValueChange={(value) =>
                  value &&
                  setScheduleReviewPreset(value as ScheduleReviewPreset)
                }
                aria-label="일정 검토 상태"
              >
                {(
                  Object.keys(
                    scheduleReviewPresetLabels
                  ) as ScheduleReviewPreset[]
                ).map((key) => (
                  <ToggleGroupItem key={key} value={key}>
                    {scheduleReviewPresetLabels[key]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="w-72">
                <ScheduleReview
                  dateLabel={
                    scheduleReviewPreset === "empty"
                      ? undefined
                      : "7월 16일 목"
                  }
                  timeLabel={
                    scheduleReviewPreset === "empty"
                      ? undefined
                      : "16:30 – 17:30"
                  }
                  relativeDayLabel={
                    scheduleReviewPreset === "empty" ? undefined : "4일 뒤"
                  }
                  constraintMessages={
                    scheduleReviewPreset === "unavailable"
                      ? ["점심시간"]
                      : []
                  }
                  unavailableAttendees={
                    scheduleReviewPreset === "unavailable"
                      ? [
                          {
                            name: "이준호",
                            avatar: `${import.meta.env.BASE_URL}profiles/002.png`,
                            role: "필수",
                            reason: "외근 이동 시간과 겹쳐요",
                          },
                          {
                            name: "최현우",
                            avatar: `${import.meta.env.BASE_URL}profiles/004.png`,
                            role: "선택",
                            reason: "배포 대응 시간과 겹쳐요",
                          },
                        ]
                      : []
                  }
                />
              </div>
            </section>
          )}

          {activeComponent === "schedule-cancel-dialog" && (
            <section
              id="schedule-cancel-dialog"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">Dialog</h1>
              </div>

              <Card className="max-w-xl">
                <CardContent className="p-4">
                  <Button
                    type="button"
                    onClick={() => setScheduleCancelDialogOpen(true)}
                  >
                    Dialog 열기
                  </Button>
                </CardContent>
              </Card>

              <ScheduleCancelDialog
                open={scheduleCancelDialogOpen}
                onOpenChange={setScheduleCancelDialogOpen}
                onCancel={() => setScheduleCancelDialogOpen(false)}
              />
            </section>
          )}

          {activeComponent === "schedule-form" && (
            <section
              id="schedule-form"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">
                  Schedule Form
                </h1>
              </div>

              <Card className="max-w-xl overflow-visible">
                <CardContent className="p-4">
                  <ScheduleForm
                    users={showcaseUsers}
                    organizer={showcaseUsers[0]!}
                    value={scheduleFormValue}
                    onValueChange={setScheduleFormValue}
                    onSubmit={() => undefined}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {activeComponent === "mini-calendar" && (
            <section
              id="mini-calendar"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">
                  Mini Calendar
                </h1>
              </div>

              <ToggleGroup
                type="single"
                value={preset}
                onValueChange={(value) =>
                  value && applyPreset(value as CalendarPreset)
                }
                aria-label="캘린더 상태"
              >
                {(Object.keys(presetLabels) as CalendarPreset[]).map((key) => (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    aria-label={presetLabels[key]}
                  >
                    {presetLabels[key]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <Card className="w-72 bg-background">
                <CardContent className="p-4">
                  <MiniCal
                    month={month}
                    onMonthChange={setMonth}
                    today={showToday ? today : new Date(0)}
                    selectedDate={selectedDate}
                    eventDates={[addDays(today, -2), addDays(today, 4)]}
                    candidateDates={[addDays(today, 2), addDays(today, 10)]}
                    onSelect={selectDate}
                    showSelectedWeek={preset === "selected-week"}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {activeComponent === "filters" && (
            <section
              id="filters"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">Filter</h1>
              </div>

              <Tabs
                value={filterTab}
                onValueChange={(value) =>
                  setFilterTab(value as ShowcaseDataTab)
                }
              >
                <TabsList variant="line" aria-label="Filter 유형">
                  <TabsTrigger value="event">일정</TabsTrigger>
                  <TabsTrigger value="candidate">후보</TabsTrigger>
                </TabsList>
                <TabsContent value="event">
                  <Card className="max-w-xl">
                    <CardContent className="p-4">
                      <UpcomingEventFilters
                        value={upcomingEventFilter}
                        onValueChange={setUpcomingEventFilter}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="candidate">
                  <Card className="max-w-xl">
                    <CardContent className="p-4">
                      <CandidateFilters
                        value={candidateRules}
                        onValueChange={setCandidateRules}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
          )}

          {activeComponent === "lists" && (
            <section id="lists" className="mx-auto w-full max-w-3xl space-y-6">
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">List</h1>
              </div>

              <Card className="max-w-xl">
                <CardContent className="p-4">
                  <ScheduleList
                    items={visibleUpcomingEvents.map((event) => ({
                      id: event.id,
                      title: event.title,
                      start: event.start,
                      end: event.end,
                    }))}
                    selectedId={selectedUpcomingEventId}
                    today={today}
                    onSelect={setSelectedUpcomingEventId}
                    ariaLabel="일정 목록"
                    emptyMessage="일정이 없어요"
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {activeComponent === "calendar-gnb" && (
            <section
              id="calendar-gnb"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">
                  Calendar GNB
                </h1>
              </div>

              <ToggleGroup
                type="single"
                value={calendarGnbMode}
                onValueChange={(value) =>
                  value && setCalendarGnbMode(value as CalendarGnbMode)
                }
                aria-label="Calendar GNB 상태"
              >
                {(Object.keys(calendarGnbModeLabels) as CalendarGnbMode[]).map(
                  (mode) => (
                    <ToggleGroupItem key={mode} value={mode}>
                      {calendarGnbModeLabels[mode]}
                    </ToggleGroupItem>
                  )
                )}
              </ToggleGroup>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <WeekCalendar
                    defaultDate={today}
                    today={today}
                    events={showcaseWeekEvents}
                    enableHotkeys={false}
                    responsiveView={false}
                    locale={ko}
                  >
                    <CalendarGnb
                      mode={calendarGnbMode}
                      onBack={() => setCalendarGnbMode("calendar")}
                      onCreate={() => setCalendarGnbMode("creating")}
                      onOpenSettings={() => undefined}
                    />
                    <div className="h-[28rem] overflow-hidden">
                      <CalendarWeekView />
                    </div>
                  </WeekCalendar>
                </CardContent>
              </Card>
            </section>
          )}

          {activeComponent === "event" && (
            <section id="event" className="mx-auto w-full max-w-3xl space-y-6">
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">Event</h1>
              </div>

              <ToggleGroup
                type="single"
                value={eventShowcaseTab}
                onValueChange={(value) =>
                  value && setEventShowcaseTab(value as EventShowcaseTab)
                }
                aria-label="Calendar event 상태"
              >
                {(
                  Object.keys(eventShowcaseTabLabels) as EventShowcaseTab[]
                ).map((key) => (
                  <ToggleGroupItem key={key} value={key}>
                    {eventShowcaseTabLabels[key]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {eventShowcaseTab === "event" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {showcaseEventStates.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <p className="tds-sub-typography-11 font-medium">
                        {item.label}
                      </p>
                      <Card>
                        <CardContent className="p-4">
                          <div className="relative h-24">
                            <CalendarEventCard
                              event={item.event}
                              state={item.state}
                              dimmed={item.dimmed}
                              style={{
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}

              {eventShowcaseTab === "availability" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="tds-sub-typography-11 font-medium">
                      가능 시간 범위
                    </p>
                    <AvailabilityRangeCard range={showcaseAvailabilityRange} />
                  </div>
                </div>
              )}

              {eventShowcaseTab === "preview" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(previewStateLabels) as PreviewState[]).map(
                    (key) => (
                      <div key={key} className="space-y-2">
                        <p className="tds-sub-typography-11 font-medium">
                          {previewStateLabels[key]}
                        </p>
                        <SelectionPreviewCard
                          slot={showcasePreviewSlots[key]}
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {activeComponent === "week-calendar" && (
            <section
              id="week-calendar"
              className="mx-auto w-full max-w-3xl space-y-6"
            >
              <div>
                <p className="tds-sub-typography-11 text-muted-foreground">
                  Component
                </p>
                <h1 className="tds-sub-typography-5 font-semibold">
                  Week Calendar
                </h1>
              </div>

              <ToggleGroup
                type="single"
                value={weekPreset}
                onValueChange={(value) =>
                  value && setWeekPreset(value as WeekCalendarPreset)
                }
                aria-label="주간 캘린더 상태"
              >
                {(Object.keys(weekPresetLabels) as WeekCalendarPreset[]).map(
                  (key) => (
                    <ToggleGroupItem
                      key={key}
                      value={key}
                      aria-label={weekPresetLabels[key]}
                    >
                      {weekPresetLabels[key]}
                    </ToggleGroupItem>
                  )
                )}
              </ToggleGroup>

              <Card>
                <CardContent className="p-0">
                  <div className="h-[36rem] overflow-hidden rounded-xl">
                    <WeekCalendar
                      defaultDate={today}
                      today={today}
                      events={showcaseWeekEvents}
                      businessHours={
                        weekPreset === "outside-business-hours" ||
                        weekPreset === "combined"
                          ? showcaseBusinessHours
                          : showcaseAllDayBusinessHours
                      }
                      avoidTimes={
                        weekPreset === "avoid-times" ||
                        weekPreset === "combined"
                          ? showcaseAvoidTimes
                          : []
                      }
                      view="week"
                      locale={ko}
                      enableHotkeys={false}
                    >
                      <CalendarWeekView />
                    </WeekCalendar>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AvailabilityRangeCard({
  range,
}: {
  range: CalendarAvailabilityRange
}) {
  return (
    <Card className="max-w-xl">
      <CardContent className="p-4">
        <CalendarAvailabilityRangeCard range={range} className="h-24" />
      </CardContent>
    </Card>
  )
}

function SelectionPreviewCard({ slot }: { slot: CalendarAvailabilitySlot }) {
  return (
    <Card className="max-w-xl">
      <CardContent className="p-4">
        <CalendarSelectionPreviewCard
          slot={slot}
          title="디자인 방향성 리뷰"
          className="relative h-24 w-full"
        />
      </CardContent>
    </Card>
  )
}
