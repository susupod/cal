import { useState } from "react"

import { AttendeePicker } from "@/components/attendee-picker"
import type { Attendee, AttendeePickerUser } from "@/components/attendee-picker"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatDuration } from "@/lib/schedule-format"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type ScheduleFormValue = {
  title: string
  durationMinutes: number | null
  room: string | null
  attendees: Attendee[]
}

type ScheduleFormProps = {
  users: AttendeePickerUser[]
  value: ScheduleFormValue
  onValueChange: (value: ScheduleFormValue) => void
  onSubmit: (value: ScheduleFormValue) => void
  organizer: AttendeePickerUser
  id?: string
  showSubmit?: boolean
  submitLabel?: string
}

const meetingRooms = ["회의실 A", "회의실 B", "화상 회의"]
const durations = [30, 60, 90, 120]

export function ScheduleForm({
  users,
  value,
  onValueChange,
  onSubmit,
  organizer,
  id,
  showSubmit = true,
  submitLabel = "일정 만들기",
}: ScheduleFormProps) {
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const updateValue = <Key extends keyof ScheduleFormValue>(
    key: Key,
    nextValue: ScheduleFormValue[Key]
  ) => {
    setErrors((current) => ({ ...current, [key]: "" }))
    onValueChange({ ...value, [key]: nextValue })
  }
  const validate = () => {
    const nextErrors = {
      title: value.title.trim() ? "" : "이름을 입력해주세요",
      attendees: value.attendees.length > 0 ? "" : "참석자를 선택해주세요",
      durationMinutes:
        value.durationMinutes != null ? "" : "길이를 선택해주세요",
    }

    setErrors(nextErrors)
    return Object.values(nextErrors).every((error) => !error)
  }

  return (
    <form
      id={id}
      onSubmit={(event) => {
        event.preventDefault()
        if (validate()) onSubmit(value)
      }}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="schedule-title">이름</FieldLabel>
          <Input
            id="schedule-title"
            value={value.title}
            placeholder="예: 디자인 방향성 리뷰"
            className="h-10"
            aria-invalid={Boolean(errors.title)}
            onChange={(event) => updateValue("title", event.target.value)}
          />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(errors.attendees)}>
          <FieldLabel>참석자</FieldLabel>
          <AttendeePicker
            users={users}
            value={value.attendees}
            onValueChange={(attendees) => updateValue("attendees", attendees)}
            organizerId={organizer.id}
            defaultSelectedListOpen={false}
          />
          {errors.attendees && <FieldError>{errors.attendees}</FieldError>}
        </Field>

        <Field data-invalid={Boolean(errors.durationMinutes)}>
          <FieldLabel>길이</FieldLabel>
          <div className="grid gap-3">
            <Select
              value={
                isCustomDuration
                  ? "custom"
                  : value.durationMinutes == null
                    ? undefined
                    : String(value.durationMinutes)
              }
              onValueChange={(duration) => {
                if (duration === "custom") {
                  setIsCustomDuration(true)
                  return
                }

                setIsCustomDuration(false)
                updateValue("durationMinutes", Number(duration))
              }}
            >
              <SelectTrigger
                size="md"
                className="w-full"
                aria-invalid={Boolean(errors.durationMinutes)}
              >
                <SelectValue placeholder="길이 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {durations.map((duration) => (
                    <SelectItem key={duration} value={String(duration)}>
                      {formatDuration(duration)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">직접 입력</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.durationMinutes && (
              <FieldError>{errors.durationMinutes}</FieldError>
            )}
            {isCustomDuration && (
              <div className="relative">
                <Input
                  aria-label="회의 길이(분)"
                  type="number"
                  min="5"
                  step="5"
                  value={value.durationMinutes ?? ""}
                  className="h-10 pr-10"
                  onChange={(event) =>
                    updateValue("durationMinutes", Number(event.target.value))
                  }
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 tds-sub-typography-11 text-muted-foreground">
                  분
                </span>
              </div>
            )}
          </div>
        </Field>

        <Field>
          <FieldLabel>회의실 (선택)</FieldLabel>
          <Select
            value={value.room ?? "none"}
            onValueChange={(room) =>
              updateValue("room", room === "none" ? null : room)
            }
          >
            <SelectTrigger size="md" className="w-full">
              <SelectValue placeholder="회의실 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">없음</SelectItem>
                {meetingRooms.map((room) => (
                  <SelectItem key={room} value={room}>
                    {room}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {showSubmit && <Button type="submit">{submitLabel}</Button>}
      </FieldGroup>
    </form>
  )
}
