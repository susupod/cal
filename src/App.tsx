import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react"
import {
  addDays,
  addMinutes,
  addMonths,
  eachDayOfInterval,
  startOfMonth,
} from "date-fns"
import { ko } from "date-fns/locale/ko"
import { LoaderCircle, X } from "lucide-react"
import { toast } from "sonner"

import { ScheduleCancelDialog } from "@/components/schedule-cancel-dialog"
import { ScheduleForm } from "@/components/schedule-form"
import { ScheduleReview } from "@/components/schedule-review"
import {
  CandidateFilters,
  type CandidateRules,
} from "@/components/candidate-filters"
import { CandidateList } from "@/components/candidate-list"
import { CalendarGnb } from "@/components/calendar-gnb"
import {
  UpcomingEventFilters,
  type UpcomingEventFilter,
} from "@/components/upcoming-event-filters"
import { UpcomingEventList } from "@/components/upcoming-event-list"
import type { ScheduleFormValue } from "@/components/schedule-form"
import type { Attendee, AttendeePickerUser } from "@/components/attendee-picker"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MiniCal } from "@/components/mini-cal"
import {
  clearTemporaryCalendarEvents,
  createCalendarEvent,
} from "@/lib/calendar-events"
import {
  getRelativeDayLabel,
  getUpcomingCandidateRanges,
} from "@/lib/calendar-candidates"
import { formatDuration } from "@/lib/schedule-format"
import {
  Calendar as FullCalendar,
  CalendarWeekView,
  subtractBusyEventsFromRange,
  useCalendar,
} from "@/components/ui/full-calendar"
import type {
  CalendarAvailabilityRange,
  CalendarAvailabilitySlot,
  CalendarAvoidTime,
  CalendarBusinessHours,
  CalendarEvent,
} from "@/components/ui/full-calendar"

const today = new Date()

const defaultMeetingTitle = "디자인 방향성 리뷰"
const defaultMeetingRoom: string | null = "회의실 A"
const defaultMeetingDurationMinutes = 60

const matchesUpcomingEventFilter = (
  event: CalendarEvent,
  filter: UpcomingEventFilter
) => {
  if (filter === "personal") return event.title === "개인 일정"
  if (filter === "meeting") return event.title !== "개인 일정"
  return true
}

const defaultAvoidTimeRules: AvoidTimeRule[] = [
  {
    id: "lunch",
    label: "점심시간",
    dayOfWeeks: [1, 2, 3, 4, 5],
    start: "12:00",
    end: "13:00",
  },
]

const defaultBusinessHours: CalendarBusinessHours[] = [
  { dayOfWeek: 0, enabled: false, start: "09:00", end: "18:00" },
  { dayOfWeek: 1, enabled: true, start: "09:00", end: "18:00" },
  { dayOfWeek: 2, enabled: true, start: "09:00", end: "18:00" },
  { dayOfWeek: 3, enabled: true, start: "09:00", end: "18:00" },
  { dayOfWeek: 4, enabled: true, start: "09:00", end: "18:00" },
  { dayOfWeek: 5, enabled: true, start: "09:00", end: "18:00" },
  { dayOfWeek: 6, enabled: false, start: "09:00", end: "18:00" },
]

type AppMode = "calendar" | "creating" | "scheduling"
type AvoidTimeRule = {
  id: string
  label: string
  dayOfWeeks: number[]
  start: string
  end: string
}

const defaultCandidateRules: CandidateRules = {
  attendeeMode: "all",
  selectedParticipantNames: [],
  requiredParticipantNames: [],
  businessHoursOnly: true,
  respectPreferences: true,
  roomAvailableOnly: true,
}

const weekdays = ["일", "월", "화", "수", "목", "금", "토"]

const participants = [
  {
    name: "김서연",
    role: "Product Designer",
    avatar: `${import.meta.env.BASE_URL}profiles/001.png`,
    required: true,
    constraint: "점심 직후 선호 낮음",
  },
  {
    name: "이준호",
    role: "Product Manager",
    avatar: `${import.meta.env.BASE_URL}profiles/002.png`,
    required: true,
    constraint: "화·목 외근 많음",
  },
  {
    name: "박민지",
    role: "Frontend Engineer",
    avatar: `${import.meta.env.BASE_URL}profiles/003.png`,
    required: true,
    constraint: "오전 집중 작업 선호",
  },
  {
    name: "최현우",
    role: "Backend Engineer",
    avatar: `${import.meta.env.BASE_URL}profiles/004.png`,
    required: true,
    constraint: "15시 이후 배포 대응",
  },
  {
    name: "정다은",
    role: "Researcher",
    avatar: `${import.meta.env.BASE_URL}profiles/005.png`,
    required: false,
    constraint: "인터뷰 일정 유동적",
  },
  {
    name: "오지훈",
    role: "Data Analyst",
    avatar: `${import.meta.env.BASE_URL}profiles/006.png`,
    required: false,
    constraint: "오후 지표 확인",
  },
]

const participantUnavailableReasons: Record<string, string> = {
  김서연: "내 일정과 겹쳐요",
  이준호: "외근 이동 시간과 겹쳐요",
  박민지: "오전 집중 작업을 막아요",
  최현우: "배포 대응 시간과 겹쳐요",
  정다은: "인터뷰 일정 조정이 필요해요",
  오지훈: "지표 확인 시간과 가까워요",
}

const scheduleFormUsers: AttendeePickerUser[] = participants.map(
  (participant, index) => ({
    id: participant.name,
    name: participant.name,
    email: `member${index + 1}@example.com`,
    avatar: participant.avatar,
  })
)
const organizerAttendee: Attendee = {
  ...scheduleFormUsers[0]!,
  role: "required",
}
const defaultScheduleAttendees: Attendee[] = scheduleFormUsers.map(
  (user, index) => ({
    ...user,
    role: participants[index]!.required ? "required" : "optional",
  })
)
const baseEvents: CalendarEvent[] = [
  eventOn("jul-01-product-sync", 1, "10:00", "11:00", "제품 싱크"),
  eventOn("jul-01-user-call", 1, "14:00", "15:00", "고객 피드백 콜"),
  eventOn("jul-02-sprint-plan", 2, "09:30", "10:30", "스프린트 계획"),
  eventOn("jul-02-lunch", 2, "12:00", "13:00", "점심시간"),
  eventOn("jul-02-design-crit", 2, "15:00", "16:00", "디자인 크리틱"),
  eventOn("jul-03-metrics", 3, "11:00", "12:00", "지표 리뷰"),
  eventOn("jul-03-legal", 3, "13:30", "14:00", "법무 검토"),
  eventOn("jul-03-handoff", 3, "16:00", "17:00", "개발 핸드오프"),
  eventOn("jul-06-standup", 6, "09:30", "10:15", "팀 스탠드업"),
  eventOn("jul-06-lunch", 6, "12:30", "13:30", "점심시간"),
  eventOn("jul-06-focus", 6, "15:00", "17:00", "집중 작업"),
  eventOn("jul-07-research", 7, "10:00", "10:45", "사용자 인터뷰"),
  eventOn("jul-07-review", 7, "10:30", "11:30", "리서치 공유"),
  eventOn("jul-07-one-on-one", 7, "11:30", "12:00", "1:1 미팅"),
  eventOn("jul-07-cs", 7, "14:00", "14:30", "CS 이슈 확인"),
  eventOn("jul-08-lunch", 8, "12:00", "13:00", "점심시간"),
  eventOn("jul-08-design-review", 8, "15:00", "16:00", "디자인 리뷰"),
  eventOn("jul-08-handoff", 8, "15:30", "16:30", "개발 핸드오프"),
  eventOn("jul-10-weekly", 10, "09:30", "10:30", "주간 회고"),
  eventOn("jul-10-onboarding", 10, "14:00", "15:00", "온보딩 리뷰"),
  eventOn("jul-11-personal", 11, "10:30", "11:30", "개인 일정"),
  eventOn("jul-11-family", 11, "15:00", "16:00", "개인 일정"),
  eventOn("jul-13-standup", 13, "09:30", "10:00", "팀 스탠드업"),
  eventOn("jul-13-brand", 13, "14:00", "15:00", "브랜드 검토"),
  eventOn("jul-13-ops", 13, "16:00", "16:30", "운영 이슈 확인"),
  eventOn("jul-14-experiment", 14, "11:00", "12:00", "실험 설계"),
  eventOn("jul-14-lunch", 14, "12:30", "13:30", "점심시간"),
  eventOn("jul-14-interview", 14, "15:00", "16:00", "사용자 인터뷰"),
  eventOn("jul-15-planning", 15, "10:00", "11:30", "로드맵 논의"),
  eventOn("jul-15-lunch", 15, "12:00", "13:00", "점심시간"),
  eventOn("jul-15-data", 15, "14:30", "15:30", "데이터 확인"),
  eventOn("jul-16-prototype", 16, "14:00", "15:30", "프로토타입 리뷰"),
  eventOn("jul-16-recruiting", 16, "16:00", "16:30", "리크루팅 콜"),
  eventOn("jul-17-weekly", 17, "09:30", "10:30", "주간 회고"),
  eventOn("jul-17-retro-prep", 17, "15:00", "16:00", "회고 준비"),
  eventOn("jul-20-standup", 20, "09:30", "10:00", "팀 스탠드업"),
  eventOn("jul-20-content", 20, "11:00", "12:00", "문구 리뷰"),
  eventOn("jul-20-qa", 20, "15:00", "16:00", "QA 확인"),
  eventOn("jul-21-research", 21, "10:00", "11:00", "사용성 테스트"),
  eventOn("jul-21-lunch", 21, "12:00", "13:00", "점심시간"),
  eventOn("jul-21-share", 21, "16:00", "17:00", "인사이트 공유"),
  eventOn("jul-22-design", 22, "13:00", "14:00", "디자인 리뷰"),
  eventOn("jul-22-finance", 22, "15:00", "15:30", "예산 확인"),
  eventOn("jul-23-handoff", 23, "11:00", "12:00", "개발 핸드오프"),
  eventOn("jul-23-lunch", 23, "12:30", "13:30", "점심시간"),
  eventOn("jul-24-weekly", 24, "09:30", "10:30", "주간 회고"),
  eventOn("jul-24-townhall", 24, "16:00", "17:00", "타운홀"),
  eventOn("jul-27-standup", 27, "09:30", "10:00", "팀 스탠드업"),
  eventOn("jul-27-kickoff", 27, "13:00", "14:00", "다음 과제 킥오프"),
  eventOn("jul-28-interview", 28, "14:00", "15:00", "사용자 인터뷰"),
  eventOn("jul-28-critique", 28, "15:00", "16:00", "시안 크리틱"),
  eventOn("jul-29-lunch", 29, "12:00", "13:00", "점심시간"),
  eventOn("jul-29-retro", 29, "16:00", "17:00", "월간 회고"),
  eventOn("jul-30-review", 30, "11:00", "12:00", "최종 리뷰"),
  eventOn("jul-30-handoff", 30, "15:00", "16:00", "릴리즈 핸드오프"),
  eventOn("jul-31-demo", 31, "15:00", "16:00", "데모데이 준비"),
  eventOn("jul-31-wrap", 31, "16:00", "17:00", "월말 정리"),
]
const events = repeatFixtureEvents(baseEvents)

const initialEventScheduleValues = events.reduce<
  Record<string, ScheduleFormValue>
>((values, event, index) => {
  values[event.id] = {
    title: event.title,
    durationMinutes: Math.round(
      (event.end.getTime() - event.start.getTime()) / 60000
    ),
    room: ["회의실 A", "회의실 B", "화상 회의"][index % 3]!,
    attendees: getFixtureScheduleAttendees(event),
  }
  return values
}, {})

const fixtureWorkdays = eachDayOfInterval({
  start: addMonths(atTime(today, "00:00"), -1),
  end: addMonths(atTime(today, "00:00"), 1),
}).filter((date) => ![0, 6].includes(date.getDay()))
const candidateDailySegments = [
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["13:00", "14:00"],
  ["14:00", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
  ["17:00", "18:00"],
] as const
const twoHourWindowIndex = fixtureWorkdays.findIndex((date) => date > today)

const participantBusyEvents = createParticipantBusyEvents()
const roomBookings: Record<string, CalendarEvent[]> = {
  "회의실 A": createRoomBookings("회의실 A", 0),
  "회의실 B": createRoomBookings("회의실 B", 1),
  "화상 회의": createRoomBookings("화상 회의", 2),
}

export function App() {
  const [appMode, setAppMode] = useState<AppMode>("calendar")
  const [selectedSlot, setSelectedSlot] =
    useState<CalendarAvailabilitySlot | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(events)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventScheduleValues, setEventScheduleValues] = useState(
    initialEventScheduleValues
  )
  const [upcomingEventFilter, setUpcomingEventFilter] =
    useState<UpcomingEventFilter>("all")
  const [meetingTitle, setMeetingTitle] = useState(defaultMeetingTitle)
  const [meetingRoom, setMeetingRoom] = useState<string | null>(
    defaultMeetingRoom
  )
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState<
    number | null
  >(defaultMeetingDurationMinutes)
  const [scheduleAttendees, setScheduleAttendees] = useState<Attendee[]>(
    defaultScheduleAttendees
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [businessHours, setBusinessHours] = useState(defaultBusinessHours)
  const [avoidTimeRules, setAvoidTimeRules] = useState(defaultAvoidTimeRules)
  const avoidTimes = useMemo(
    () => createAvoidTimes(avoidTimeRules),
    [avoidTimeRules]
  )
  const [candidateRules, setCandidateRules] = useState(defaultCandidateRules)
  const [isFindingTime, setIsFindingTime] = useState(false)
  const findTimeTimerRef = useRef<number | null>(null)
  const candidateBlockingEvents = useMemo(
    () =>
      getCandidateBlockingEvents(
        candidateRules,
        meetingRoom,
        calendarEvents,
        avoidTimes
      ),
    [avoidTimes, calendarEvents, candidateRules, meetingRoom]
  )
  const schedulingCandidateRanges = useMemo(
    () =>
      meetingDurationMinutes == null
        ? []
        : getUpcomingCandidateRanges(
            getCandidateSegments(
              getCandidateRanges(candidateRules, meetingDurationMinutes),
              candidateBlockingEvents
            ),
            today
          ),
    [candidateBlockingEvents, candidateRules, meetingDurationMinutes]
  )
  const visibleAvailabilityRanges =
    appMode === "scheduling" ? schedulingCandidateRanges : []

  const getManualSlot = (
    slot: CalendarAvailabilitySlot,
    durationMinutes: number,
    rules: CandidateRules,
    room: string | null
  ): CalendarAvailabilitySlot => {
    const targetNames = getTargetParticipantNames(rules)
    const end = addMinutes(slot.start, durationMinutes)
    const blockers = getCandidateBlockingEvents(
      rules,
      room,
      calendarEvents,
      avoidTimes
    ).filter((event) => event.start < end && event.end > slot.start)
    const isWithinBusinessHours = (() => {
      const hours = businessHours.find(
        (item) => item.dayOfWeek === slot.start.getDay()
      )
      if (hours == null || !hours.enabled) return false

      return (
        slot.start >= atTime(slot.start, hours.start) &&
        end <= atTime(slot.start, hours.end)
      )
    })()
    const constraintMessages = [
      ...(rules.businessHoursOnly && !isWithinBusinessHours
        ? ["업무 시간 밖"]
        : []),
      ...blockers
        .filter((event) => getBlockingAttendeeNames(event).length === 0)
        .map((event) => event.title),
    ]
    const unavailableParticipantNames = [
      ...new Set(
        blockers.flatMap((event) =>
          getBlockingAttendeeNames(event).filter((name) =>
            targetNames.includes(name)
          )
        )
      ),
    ]

    const blocked =
      unavailableParticipantNames.length > 0 || constraintMessages.length > 0

    return {
      ...slot,
      end,
      blocked,
      recommended: slot.range != null && !blocked,
      unavailableParticipantNames,
      constraintMessages,
    }
  }

  const isSchedulingMode = appMode === "scheduling"
  const selectedEvent = calendarEvents.find(
    (event) => event.id === selectedEventId
  )
  const selectedEventScheduleValue =
    selectedEvent == null ? null : eventScheduleValues[selectedEvent.id]
  const disabledEventIds =
    appMode === "calendar"
      ? calendarEvents
          .filter(
            (event) => !matchesUpcomingEventFilter(event, upcomingEventFilter)
          )
          .map((event) => event.id)
      : []
  const changeScheduleForm = (nextValue: ScheduleFormValue) => {
    const nextRules: CandidateRules = {
      ...candidateRules,
      attendeeMode: "all",
      roomAvailableOnly:
        nextValue.room === meetingRoom
          ? candidateRules.roomAvailableOnly
          : nextValue.room != null,
      selectedParticipantNames: nextValue.attendees.map(
        (attendee) => attendee.name
      ),
      requiredParticipantNames: nextValue.attendees
        .filter((attendee) => attendee.role === "required")
        .map((attendee) => attendee.name),
    }
    setMeetingTitle(nextValue.title)
    setMeetingRoom(nextValue.room)
    setMeetingDurationMinutes(nextValue.durationMinutes)
    setScheduleAttendees(nextValue.attendees)
    setCandidateRules(nextRules)
    if (isSchedulingMode) {
      setSelectedSlot(null)
    } else if (appMode === "creating" && nextValue.durationMinutes != null) {
      const durationMinutes = nextValue.durationMinutes
      setSelectedSlot((current) =>
        current == null
          ? null
          : {
              ...getManualSlot(
                current,
                durationMinutes,
                nextRules,
                nextValue.room
              ),
            }
      )
    }
  }
  const changeCandidateRules = (nextRules: CandidateRules) => {
    setCandidateRules(nextRules)

    if (isSchedulingMode) {
      setSelectedSlot(null)
    }
  }
  const scheduleFormValue: ScheduleFormValue = {
    title: meetingTitle,
    durationMinutes: meetingDurationMinutes,
    room: meetingRoom,
    attendees: scheduleAttendees,
  }
  const selectAvailabilitySlot = (slot: CalendarAvailabilitySlot) => {
    setSelectedEventId(null)
    setSelectedSlot(slot)
    setAppMode("scheduling")
  }
  const selectTimeSlot = (slot: CalendarAvailabilitySlot) => {
    if (appMode === "scheduling") {
      setSelectedSlot(
        slot.range == null
          ? getManualSlot(
              slot,
              meetingDurationMinutes ?? 60,
              candidateRules,
              meetingRoom
            )
          : slot
      )
    }
  }
  const selectEvent = (event: CalendarEvent) => {
    setSelectedSlot(null)
    setSelectedEventId(event.id)
    setAppMode("calendar")
  }
  const startCreating = () => {
    setCalendarEvents(clearTemporaryCalendarEvents)
    setMeetingTitle(defaultMeetingTitle)
    setMeetingRoom(defaultMeetingRoom)
    setMeetingDurationMinutes(defaultMeetingDurationMinutes)
    setScheduleAttendees(defaultScheduleAttendees)
    setCandidateRules({
      ...defaultCandidateRules,
      selectedParticipantNames: defaultScheduleAttendees.map(
        (attendee) => attendee.name
      ),
      requiredParticipantNames: defaultScheduleAttendees
        .filter((attendee) => attendee.role === "required")
        .map((attendee) => attendee.name),
    })
    setSelectedEventId(null)
    setSelectedSlot(null)
    setAppMode("creating")
  }
  const cancelSchedule = () => {
    if (findTimeTimerRef.current != null) {
      window.clearTimeout(findTimeTimerRef.current)
      findTimeTimerRef.current = null
    }
    setIsFindingTime(false)
    setMeetingTitle(defaultMeetingTitle)
    setMeetingRoom(defaultMeetingRoom)
    setMeetingDurationMinutes(defaultMeetingDurationMinutes)
    setScheduleAttendees(defaultScheduleAttendees)
    setCandidateRules(defaultCandidateRules)
    setAvoidTimeRules(defaultAvoidTimeRules)
    setSelectedEventId(null)
    setSelectedSlot(null)
    setAppMode("calendar")
  }
  const startScheduling = () => {
    if (meetingDurationMinutes == null || findTimeTimerRef.current != null) {
      return
    }

    setIsFindingTime(true)
    findTimeTimerRef.current = window.setTimeout(() => {
      findTimeTimerRef.current = null
      setSelectedSlot(null)
      setAppMode("scheduling")
      setIsFindingTime(false)
    }, 700)
  }

  return (
    <FullCalendar
      defaultDate={today}
      today={today}
      view="week"
      events={calendarEvents}
      availabilityRanges={visibleAvailabilityRanges}
      businessHours={businessHours}
      avoidTimes={avoidTimes}
      enableHotkeys={false}
      responsiveView={false}
      locale={ko}
      onAvailabilitySelect={selectTimeSlot}
      resolveAvailabilitySlot={(slot) =>
        appMode === "scheduling"
          ? getManualSlot(
              slot,
              meetingDurationMinutes ?? 60,
              candidateRules,
              meetingRoom
            )
          : slot
      }
      onEventClick={selectEvent}
      selectedAvailabilitySlot={appMode === "calendar" ? null : selectedSlot}
      selectionEnabled={appMode === "scheduling"}
      selectionPreviewEnabled={appMode === "scheduling"}
      selectionStyle="default"
      eventSelectionEnabled={appMode === "calendar"}
      disabledEventIds={disabledEventIds}
      selectedEventId={selectedEventId}
      selectionTitle={meetingTitle}
      selectionDurationMinutes={meetingDurationMinutes ?? 60}
    >
      <main className="flex h-svh min-w-[1280px] flex-col bg-background text-foreground">
        <CalendarGnb
          mode={appMode}
          onBack={() => setIsCancelConfirmOpen(true)}
          onCreate={startCreating}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          {isSchedulingMode ? (
            <CandidatePanel
              visibleAvailabilityRanges={schedulingCandidateRanges}
              candidateRules={candidateRules}
              roomSelected={meetingRoom != null}
              selectedSlot={selectedSlot}
              onCandidateRulesChange={changeCandidateRules}
              onSelect={selectAvailabilitySlot}
            />
          ) : (
            <CalendarRail
              events={calendarEvents}
              filter={upcomingEventFilter}
              onFilterChange={setUpcomingEventFilter}
              selectedEventId={selectedEventId}
              onSelect={selectEvent}
            />
          )}

          <section className="relative min-h-0 min-w-0 flex-1">
            <CalendarWeekView />
          </section>

          {appMode !== "calendar" ? (
            <ResizableRightPanel>
              <SelectionDetailPanel
                isCreating={appMode === "creating"}
                selectedSlot={selectedSlot}
                onRequestClose={() => setIsCancelConfirmOpen(true)}
                scheduleFormValue={scheduleFormValue}
                onScheduleFormChange={changeScheduleForm}
                onStartScheduling={startScheduling}
                isFindingTime={isFindingTime}
                onConfirm={(slot) => {
                  const event = {
                    ...createCalendarEvent({
                      id: `meeting-${Date.now()}`,
                      title: meetingTitle.trim() || "새 일정",
                      start: slot.start,
                      end: slot.end,
                    }),
                    attendeeNames: scheduleAttendees.map(
                      (attendee) => attendee.name
                    ),
                  }
                  setCalendarEvents((current) => [...current, event])
                  setEventScheduleValues((current) => ({
                    ...current,
                    [event.id]: {
                      title: event.title,
                      durationMinutes: meetingDurationMinutes ?? 60,
                      room: meetingRoom,
                      attendees: scheduleAttendees,
                    },
                  }))
                  setSelectedEventId(event.id)
                  setSelectedSlot(null)
                  setAppMode("calendar")
                  toast.success("일정이 만들어졌어요", {
                    description: `${event.title} · ${formatDateLabel(slot.start)} ${formatTime(slot.start)}`,
                    duration: 2500,
                  })
                }}
              />
            </ResizableRightPanel>
          ) : selectedEvent != null && selectedEventScheduleValue != null ? (
            <ResizableRightPanel>
              <EventDetailPanel
                event={selectedEvent}
                scheduleValue={selectedEventScheduleValue}
              />
            </ResizableRightPanel>
          ) : null}
        </div>

        {settingsOpen && (
          <BusinessHoursDialog
            businessHours={businessHours}
            onBusinessHoursChange={setBusinessHours}
            avoidTimeRules={avoidTimeRules}
            onAvoidTimeRulesChange={setAvoidTimeRules}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        <ScheduleCancelDialog
          open={isCancelConfirmOpen}
          onOpenChange={setIsCancelConfirmOpen}
          onCancel={() => {
            setIsCancelConfirmOpen(false)
            cancelSchedule()
          }}
        />
      </main>
    </FullCalendar>
  )
}

function CalendarRail({
  events,
  filter,
  onFilterChange,
  selectedEventId,
  onSelect,
}: {
  events: CalendarEvent[]
  filter: UpcomingEventFilter
  onFilterChange: (filter: UpcomingEventFilter) => void
  selectedEventId: string | null
  onSelect: (event: CalendarEvent) => void
}) {
  const { date, setDate } = useCalendar()
  const scrollRootRef = useRef<HTMLElement>(null)
  const upcomingEvents = events.filter(
    (event) => event.end >= today && matchesUpcomingEventFilter(event, filter)
  )

  return (
    <aside
      ref={scrollRootRef}
      className="workspace-content-swap flex h-full w-[18rem] shrink-0 flex-col overflow-y-auto border-r bg-card/40"
    >
      <div className="p-4">
        <section>
          <MiniCal
            month={startOfMonth(date)}
            onMonthChange={setDate}
            today={today}
            selectedDate={date}
            eventDates={upcomingEvents.map((event) => event.start)}
            onSelect={(day) => day && setDate(day)}
            showHeader={false}
          />
        </section>
        <div className="mt-5 border-t pt-4">
          <UpcomingEventFilters value={filter} onValueChange={onFilterChange} />
        </div>
        <div className="mt-5 border-t pt-4">
          <UpcomingEventList
            events={upcomingEvents}
            selectedEventId={selectedEventId}
            today={today}
            onSelect={(event) => {
              setDate(event.start)
              onSelect(event)
            }}
            scrollRootRef={scrollRootRef}
          />
        </div>
      </div>
    </aside>
  )
}

function CandidatePanel({
  visibleAvailabilityRanges,
  candidateRules,
  roomSelected,
  selectedSlot,
  onCandidateRulesChange,
  onSelect,
}: {
  visibleAvailabilityRanges: CalendarAvailabilityRange[]
  candidateRules: CandidateRules
  roomSelected: boolean
  selectedSlot: CalendarAvailabilitySlot | null
  onCandidateRulesChange: (rules: CandidateRules) => void
  onSelect: (slot: CalendarAvailabilitySlot) => void
}) {
  const { date, setDate, setFocusedAvailabilityRangeId } = useCalendar()

  useLayoutEffect(() => {
    if (selectedSlot != null) {
      setDate(selectedSlot.start)
    }
  }, [selectedSlot, setDate])

  return (
    <aside className="workspace-content-swap flex h-full w-[18rem] shrink-0 flex-col overflow-y-auto border-r bg-card/40">
      <div className="p-4">
        <section>
          <MiniCal
            month={startOfMonth(date)}
            onMonthChange={setDate}
            today={today}
            selectedDate={date}
            candidateDates={visibleAvailabilityRanges.map(
              (range) => range.start
            )}
            onSelect={(day) => day && setDate(day)}
            showHeader={false}
          />
        </section>
        <div className="mt-5 border-t pt-4">
          <CandidateFilters
            value={candidateRules}
            roomSelected={roomSelected}
            onValueChange={onCandidateRulesChange}
          />
        </div>
        <div className="mt-5 border-t pt-4">
          <CandidateList
            ranges={visibleAvailabilityRanges}
            selectedSlot={selectedSlot}
            today={today}
            onSelect={(slot) => {
              setDate(slot.start)
              setFocusedAvailabilityRangeId(slot.range?.id ?? null)
              onSelect(slot)
            }}
          />
        </div>
      </div>
    </aside>
  )
}

const rightPanelMinWidth = 288
const rightPanelMaxWidth = 448

function ResizableRightPanel({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(rightPanelMinWidth)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const resize = (nextWidth: number) => {
    setWidth(
      Math.min(rightPanelMaxWidth, Math.max(rightPanelMinWidth, nextWidth))
    )
  }
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current == null) return
    resize(dragRef.current.startWidth + dragRef.current.startX - event.clientX)
  }
  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <aside
      className="workspace-panel-enter-rnb relative flex shrink-0 flex-col border-l bg-background"
      style={{ width }}
    >
      <div
        role="separator"
        aria-label="오른쪽 패널 너비 조절"
        aria-orientation="vertical"
        aria-valuemin={rightPanelMinWidth}
        aria-valuemax={rightPanelMaxWidth}
        aria-valuenow={width}
        tabIndex={0}
        className="group absolute inset-y-0 left-0 z-20 w-1 -translate-x-1/2 cursor-col-resize touch-none outline-none"
        onPointerDown={(event) => {
          dragRef.current = { startX: event.clientX, startWidth: width }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") resize(width + 16)
          if (event.key === "ArrowRight") resize(width - 16)
        }}
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-[width,background-color] group-hover:w-1 group-hover:bg-primary/40 group-focus-visible:w-1 group-focus-visible:bg-primary" />
      </div>
      {children}
    </aside>
  )
}

function SelectionDetailPanel({
  isCreating,
  selectedSlot,
  onRequestClose,
  scheduleFormValue,
  onScheduleFormChange,
  onStartScheduling,
  isFindingTime,
  onConfirm,
}: {
  isCreating: boolean
  selectedSlot: CalendarAvailabilitySlot | null
  onRequestClose: () => void
  scheduleFormValue: ScheduleFormValue
  onScheduleFormChange: (value: ScheduleFormValue) => void
  onStartScheduling: () => void
  isFindingTime: boolean
  onConfirm: (slot: CalendarAvailabilitySlot) => void
}) {
  return (
    <>
      <div
        key={isCreating ? "creating" : "scheduling"}
        className="workspace-content-swap min-h-0 flex-1 overflow-y-auto p-4"
      >
        <section className={isCreating ? "pb-4" : "border-b pb-4"}>
          <ScheduleForm
            users={scheduleFormUsers}
            organizer={scheduleFormUsers[0]!}
            value={scheduleFormValue}
            onValueChange={onScheduleFormChange}
            onSubmit={
              isCreating
                ? onStartScheduling
                : () => {
                    if (selectedSlot != null) {
                      onConfirm(selectedSlot)
                    }
                  }
            }
            id="schedule-form"
            showSubmit={false}
            submitLabel="시간 찾기"
          />
        </section>

        {!isCreating && (
          <div className="py-4">
            {selectedSlot == null ? (
              <ScheduleReview />
            ) : (
              <SelectionDetailCard
                selectedSlot={selectedSlot}
                participantNames={scheduleFormValue.attendees.map(
                  (attendee) => attendee.name
                )}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t p-4">
        <Button
          type="button"
          variant="secondary"
          className="h-10 flex-1"
          onClick={onRequestClose}
        >
          취소
        </Button>
        {isCreating ? (
          <Button
            type="submit"
            form="schedule-form"
            className="h-10 flex-1"
            disabled={isFindingTime}
            aria-busy={isFindingTime}
          >
            {isFindingTime && (
              <LoaderCircle className="animate-spin" aria-hidden />
            )}
            {isFindingTime ? "시간 찾는 중" : "시간 찾기"}
          </Button>
        ) : (
          <Button
            type="submit"
            form="schedule-form"
            className="h-10 flex-1"
            disabled={selectedSlot == null}
          >
            일정 만들기
          </Button>
        )}
      </div>

    </>
  )
}

function ReadOnlyScheduleField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Field>
      <FieldTitle>{label}</FieldTitle>
      <Input value={value} readOnly className="h-10 cursor-default" />
    </Field>
  )
}

function EventDetailPanel({
  event,
  scheduleValue,
}: {
  event: CalendarEvent
  scheduleValue: ScheduleFormValue
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <FieldGroup>
        <ReadOnlyScheduleField label="이름" value={event.title} />
        <ReadOnlyScheduleField
          label="시간"
          value={`${formatDateLabel(event.start)} · ${formatTime(event.start)} – ${formatTime(event.end)}`}
        />
        <Field>
          <FieldTitle>참석자</FieldTitle>
          <div
            role="textbox"
            aria-readonly="true"
            className="flex h-10 cursor-default items-center gap-2 rounded-md border border-input bg-transparent px-3 tds-sub-typography-11"
          >
            <span>참석자 {scheduleValue.attendees.length}명</span>
            <AvatarGroup aria-hidden>
              {scheduleValue.attendees.slice(0, 4).map((attendee) => (
                <Avatar key={attendee.id} size="sm">
                  <AvatarImage src={attendee.avatar} alt="" />
                  <AvatarFallback>{attendee.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
              ))}
              {scheduleValue.attendees.length > 4 && (
                <AvatarGroupCount>
                  +{scheduleValue.attendees.length - 4}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          </div>
        </Field>
        <ReadOnlyScheduleField
          label="길이"
          value={formatDuration(scheduleValue.durationMinutes ?? 60)}
        />
        <ReadOnlyScheduleField
          label="회의실"
          value={scheduleValue.room ?? "없음"}
        />
      </FieldGroup>
    </div>
  )
}

function SelectionDetailCard({
  selectedSlot,
  participantNames,
}: {
  selectedSlot: CalendarAvailabilitySlot
  participantNames: string[]
}) {
  const availableNameSet = new Set(
    selectedSlot.range == null
      ? participantNames.filter(
          (name) => !selectedSlot.unavailableParticipantNames?.includes(name)
        )
      : (selectedSlot.range.availableParticipantNames ?? [])
  )
  const unavailableParticipants = participants.filter(
    (participant) =>
      participantNames.includes(participant.name) &&
      !availableNameSet.has(participant.name)
  )

  return (
    <ScheduleReview
      dateLabel={formatDateLabel(selectedSlot.start)}
      timeLabel={`${formatTime(selectedSlot.start)} – ${formatTime(selectedSlot.end)}`}
      relativeDayLabel={getRelativeDayLabel(selectedSlot.start, today)}
      constraintMessages={selectedSlot.constraintMessages}
      unavailableAttendees={unavailableParticipants.map((participant) => ({
        name: participant.name,
        avatar: participant.avatar,
        role: participant.required ? "필수" : "선택",
        reason: participantUnavailableReasons[participant.name],
      }))}
    />
  )
}

function BusinessHoursDialog({
  businessHours,
  onBusinessHoursChange,
  avoidTimeRules,
  onAvoidTimeRulesChange,
  onClose,
}: {
  businessHours: CalendarBusinessHours[]
  onBusinessHoursChange: (businessHours: CalendarBusinessHours[]) => void
  avoidTimeRules: AvoidTimeRule[]
  onAvoidTimeRulesChange: (rules: AvoidTimeRule[]) => void
  onClose: () => void
}) {
  const activeDays = businessHours
    .filter((item) => item.enabled)
    .map((item) => item.dayOfWeek)
  const start = businessHours.find((item) => item.enabled)?.start ?? "09:00"
  const end = businessHours.find((item) => item.enabled)?.end ?? "18:00"
  const updateBusinessHours = (
    nextDays = activeDays,
    nextStart = start,
    nextEnd = end
  ) => {
    onBusinessHoursChange(
      businessHours.map((item) => ({
        ...item,
        enabled: nextDays.includes(item.dayOfWeek),
        start: nextStart,
        end: nextEnd,
      }))
    )
  }
  const updateAvoidTimeRule = (
    id: string,
    nextValue: Partial<AvoidTimeRule>
  ) => {
    onAvoidTimeRulesChange(
      avoidTimeRules.map((rule) =>
        rule.id === id ? { ...rule, ...nextValue } : rule
      )
    )
  }

  return (
    <div
      className="fixed inset-0 z-[2000] grid place-items-center bg-black/30 p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-hours-title"
        className="flex max-h-[90svh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2
              id="business-hours-title"
              className="tds-typography-5 font-semibold text-foreground"
            >
              설정
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="설정 닫기"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto px-5">
          <section>
            <p className="tds-sub-typography-10 font-semibold">업무 시간</p>
            <div className="mt-4">
              <p className="tds-sub-typography-11 font-medium">요일</p>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {weekdays.map((weekday, dayOfWeek) => {
                  const isActive = activeDays.includes(dayOfWeek)

                  return (
                    <Button
                      key={weekday}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="px-0"
                      aria-pressed={isActive}
                      onClick={() =>
                        updateBusinessHours(
                          isActive
                            ? activeDays.filter((day) => day !== dayOfWeek)
                            : [...activeDays, dayOfWeek]
                        )
                      }
                    >
                      {weekday}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className="mt-5">
              <p className="tds-sub-typography-11 font-medium">시간</p>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  type="time"
                  value={start}
                  aria-label="업무 시간 시작"
                  onChange={(event) =>
                    updateBusinessHours(activeDays, event.target.value)
                  }
                  className="h-9 w-full rounded-lg border bg-background px-2 tds-sub-typography-11 text-foreground"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="time"
                  value={end}
                  aria-label="업무 시간 종료"
                  onChange={(event) =>
                    updateBusinessHours(activeDays, start, event.target.value)
                  }
                  className="h-9 w-full rounded-lg border bg-background px-2 tds-sub-typography-11 text-foreground"
                />
              </div>
            </div>
          </section>

          <section className="border-t pt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="tds-sub-typography-10 font-semibold">비선호 시간</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onAvoidTimeRulesChange([
                    ...avoidTimeRules,
                    {
                      id: `avoid-${Date.now()}`,
                      label: "비선호 시간",
                      dayOfWeeks: [1, 2, 3, 4, 5],
                      start: "12:00",
                      end: "13:00",
                    },
                  ])
                }
              >
                추가
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {avoidTimeRules.map((rule) => (
                <div key={rule.id} className="rounded-xl border p-3">
                  <div className="flex gap-2">
                    <input
                      value={rule.label}
                      aria-label="비선호 시간 이름"
                      onChange={(event) =>
                        updateAvoidTimeRule(rule.id, {
                          label: event.target.value,
                        })
                      }
                      className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2 tds-sub-typography-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${rule.label} 삭제`}
                      onClick={() =>
                        onAvoidTimeRulesChange(
                          avoidTimeRules.filter((item) => item.id !== rule.id)
                        )
                      }
                    >
                      <X className="size-4 text-muted-foreground" aria-hidden />
                    </Button>
                  </div>
                  <div className="mt-3">
                    <p className="tds-sub-typography-11 font-medium">시간</p>
                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="time"
                        value={rule.start}
                        aria-label={`${rule.label} 시작`}
                        onChange={(event) =>
                          updateAvoidTimeRule(rule.id, {
                            start: event.target.value,
                          })
                        }
                        className="h-8 w-full rounded-lg border bg-background px-2 tds-sub-typography-11 text-foreground"
                      />
                      <span className="text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={rule.end}
                        aria-label={`${rule.label} 종료`}
                        onChange={(event) =>
                          updateAvoidTimeRule(rule.id, {
                            end: event.target.value,
                          })
                        }
                        className="h-8 w-full rounded-lg border bg-background px-2 tds-sub-typography-11 text-foreground"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="tds-sub-typography-11 font-medium">요일</p>
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {weekdays.map((weekday, dayOfWeek) => {
                        const isActive = rule.dayOfWeeks.includes(dayOfWeek)
                        return (
                          <Button
                            key={weekday}
                            type="button"
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className="px-0"
                            aria-pressed={isActive}
                            onClick={() =>
                              updateAvoidTimeRule(rule.id, {
                                dayOfWeeks: isActive
                                  ? rule.dayOfWeeks.filter(
                                      (day) => day !== dayOfWeek
                                    )
                                  : [...rule.dayOfWeeks, dayOfWeek],
                              })
                            }
                          >
                            {weekday}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 flex shrink-0 justify-end gap-2 border-t p-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onBusinessHoursChange(defaultBusinessHours)
              onAvoidTimeRulesChange(defaultAvoidTimeRules)
            }}
          >
            초기화
          </Button>
          <Button type="button" onClick={onClose}>
            완료
          </Button>
        </div>
      </section>
    </div>
  )
}

function eventOn(
  id: string,
  day: number,
  start: string,
  end: string,
  title: string
): CalendarEvent {
  const date = getFixtureDate(day)

  return {
    id,
    title,
    color: "grey",
    start: atTime(date, start),
    end: atTime(date, end),
    kind: "busy",
    icon: undefined,
    avatars: undefined,
    attendeeNames: getEventAttendeeNames(id, title),
  }
}

function getCandidateSegments(
  ranges: CalendarAvailabilityRange[],
  busyEvents: CalendarEvent[]
) {
  return ranges
    .flatMap((range) => subtractBusyEventsFromRange(range, busyEvents))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

function formatDateLabel(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdays[date.getDay()]}`
}

function formatTime(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
}

function getCandidateBlockingEvents(
  candidateRules: CandidateRules,
  meetingRoom: string | null,
  calendarEvents: CalendarEvent[],
  avoidTimes: CalendarAvoidTime[]
) {
  const targetNames = getTargetParticipantNames(candidateRules)

  return [
    ...calendarEvents.filter((event) =>
      getBlockingAttendeeNames(event).some((name) => targetNames.includes(name))
    ),
    ...participantBusyEvents.filter((event) =>
      getBlockingAttendeeNames(event).some((name) => targetNames.includes(name))
    ),
    ...(candidateRules.respectPreferences ? avoidTimes : []),
    ...(candidateRules.roomAvailableOnly && meetingRoom != null
      ? (roomBookings[meetingRoom] ?? [])
      : []),
  ]
}

function getCandidateRanges(
  candidateRules: CandidateRules,
  durationMinutes: number
) {
  const targetNames = getTargetParticipantNames(candidateRules)

  return eachDayOfInterval({
    start: addMonths(atTime(today, "00:00"), -1),
    end: addMonths(atTime(today, "00:00"), 1),
  })
    .filter(
      (date) =>
        !candidateRules.businessHoursOnly || ![0, 6].includes(date.getDay())
    )
    .map((date) => ({
      id: `candidate-${date.toISOString()}`,
      title: "가능 시간",
      start: atTime(date, candidateRules.businessHoursOnly ? "09:00" : "00:00"),
      end: atTime(date, candidateRules.businessHoursOnly ? "18:00" : "24:00"),
      availableCount: targetNames.length,
      totalCount: targetNames.length,
      availableParticipantNames: targetNames,
      color: "green" as const,
      durationMinutes,
    }))
}

function getTargetParticipantNames(candidateRules: CandidateRules) {
  const allNames =
    candidateRules.selectedParticipantNames.length > 0
      ? candidateRules.selectedParticipantNames
      : participants.map((participant) => participant.name)
  const requiredNames =
    candidateRules.requiredParticipantNames.length > 0
      ? candidateRules.requiredParticipantNames
      : participants
          .filter((participant) => participant.required)
          .map((participant) => participant.name)

  return candidateRules.attendeeMode === "required" ? requiredNames : allNames
}

function getBlockingAttendeeNames(event: CalendarEvent) {
  return event.attendeeNames ?? []
}

function getFixtureScheduleAttendees(event: CalendarEvent): Attendee[] {
  return (event.attendeeNames ?? []).map((name) => {
    const user = scheduleFormUsers.find((candidate) => candidate.name === name)!
    const participant = participants.find(
      (candidate) => candidate.name === name
    )!
    return { ...user, role: participant.required ? "required" : "optional" }
  })
}

function getEventAttendeeNames(id: string, title: string) {
  if (title === "개인 일정" || title === "집중 작업" || title === "점심시간") {
    return [organizerAttendee.name]
  }

  if (
    ["로드맵 논의", "디자인 리뷰", "디자인 크리틱", "프로토타입 리뷰"].includes(
      title
    )
  ) {
    return ["김서연", "이준호", "박민지"]
  }

  const ownerIndex =
    [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    participants.length
  return [
    ...new Set([organizerAttendee.name, participants[ownerIndex]!.name]),
  ]
}

function getSharedFreeSegmentIndexes(dateIndex: number) {
  return dateIndex === twoHourWindowIndex
    ? [6, 7]
    : [dateIndex % candidateDailySegments.length]
}

function createParticipantBusyEvents(): CalendarEvent[] {
  return fixtureWorkdays.flatMap((date, dateIndex) => {
    const sharedFreeSegments = getSharedFreeSegmentIndexes(dateIndex)

    return candidateDailySegments.flatMap(
      ([startTime, endTime], segmentIndex) => {
        if (sharedFreeSegments.includes(segmentIndex)) return []

        const participant =
          participants[(dateIndex + segmentIndex) % participants.length]!
        const start = atTime(date, startTime)

        return [
          {
            id: `busy-${participant.name}-${date.toISOString()}-${startTime}`,
            title: `${participant.name} 일정`,
            start,
            end: atTime(date, endTime),
            color: "grey" as const,
            kind: "busy" as const,
            attendeeNames: [participant.name],
          },
        ]
      }
    )
  })
}

function createAvoidTimes(rules: AvoidTimeRule[]): CalendarAvoidTime[] {
  const dates = eachDayOfInterval({
    start: addMonths(atTime(today, "00:00"), -1),
    end: addMonths(atTime(today, "00:00"), 1),
  })

  return rules.flatMap((rule) =>
    dates
      .filter((date) => rule.dayOfWeeks.includes(date.getDay()))
      .map((date) => ({
        id: `${rule.id}-${date.toISOString()}`,
        title: rule.label,
        start: atTime(date, rule.start),
        end: atTime(date, rule.end),
      }))
  )
}

function createRoomBookings(room: string, roomIndex: number): CalendarEvent[] {
  return fixtureWorkdays.flatMap((date, dateIndex) => {
    if (dateIndex % 3 !== roomIndex) return []

    return getSharedFreeSegmentIndexes(dateIndex).map((segmentIndex) => {
      const [startTime, endTime] = candidateDailySegments[segmentIndex]!
      return {
        id: `room-${room}-${date.toISOString()}-${startTime}`,
        title: `${room} 예약`,
        start: atTime(date, startTime),
        end: atTime(date, endTime),
        color: "grey" as const,
        kind: "busy" as const,
      }
    })
  })
}

function repeatFixtureEvents(baseEvents: CalendarEvent[]) {
  const start = addMonths(atTime(today, "00:00"), -1)
  const end = addMonths(atTime(today, "00:00"), 1)

  return [-28, 0, 28]
    .flatMap((dayOffset) =>
      baseEvents.map((event) => ({
        ...event,
        id: `${event.id}-${dayOffset}`,
        start: addDays(event.start, dayOffset),
        end: addDays(event.end, dayOffset),
      }))
    )
    .filter((event) => event.end >= start && event.start <= end)
}

function getFixtureDate(day: number) {
  return addDays(atTime(today, "00:00"), day - 8)
}

function atTime(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number)
  const next = new Date(date)
  next.setHours(hour, minute, 0, 0)
  return next
}

export default App
