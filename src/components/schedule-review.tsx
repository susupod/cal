import { CalendarClock, CircleAlert, CircleCheck } from "lucide-react"

export type ScheduleReviewUnavailableAttendee = {
  name: string
  avatar: string
  role: "필수" | "선택"
  reason: string
}

type ScheduleReviewProps = {
  dateLabel?: string
  timeLabel?: string
  relativeDayLabel?: string
  unavailableAttendees?: ScheduleReviewUnavailableAttendee[]
  constraintMessages?: string[]
}

export function ScheduleReview({
  dateLabel,
  timeLabel,
  relativeDayLabel,
  unavailableAttendees = [],
  constraintMessages = [],
}: ScheduleReviewProps) {
  const hasSelection = dateLabel != null && timeLabel != null
  const hasConflict =
    constraintMessages.length > 0 || unavailableAttendees.length > 0
  const StatusIcon = !hasSelection
    ? CalendarClock
    : hasConflict
      ? CircleAlert
      : CircleCheck
  const title = !hasSelection
    ? "후보 시간을 선택하세요"
    : hasConflict
      ? "확인이 필요해요"
      : "모두가 가능해요"
  const description = "참석 가능 여부와 충돌 이유를 확인할 수 있어요"
  const tone = !hasSelection
    ? "bg-primary/10 text-primary"
    : hasConflict
      ? "bg-warning/10 text-warning"
      : "bg-success/10 text-success"

  return (
    <section
      aria-label="일정 검토"
      aria-live="polite"
      className="rounded-xl bg-muted/60 p-4 pb-3.5"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <StatusIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="tds-sub-typography-11 font-semibold">{title}</p>
          {hasSelection ? (
            <div className="mt-1 tds-sub-typography-12 text-muted-foreground">
              <p className="font-medium">
                {dateLabel}
                {relativeDayLabel != null && (
                  <>
                    {" · "}
                    <span className="whitespace-nowrap">
                      {relativeDayLabel}
                    </span>
                  </>
                )}
              </p>
              <p>{timeLabel}</p>
            </div>
          ) : (
            <p className="mt-1 tds-sub-typography-12 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {hasConflict && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          {constraintMessages.length > 0 && (
            <section aria-label="충돌한 조건">
              <p className="tds-sub-typography-12 font-medium text-muted-foreground">
                충돌한 조건
              </p>
              <div className="mt-2 space-y-2">
                {constraintMessages.map((message) => (
                  <p
                    key={message}
                    className="inline-flex rounded-md bg-warning/10 px-2 py-1 tds-sub-typography-12 font-medium text-warning"
                  >
                    {message}
                  </p>
                ))}
              </div>
            </section>
          )}

          {unavailableAttendees.length > 0 && (
            <section
              aria-label={`참석 불가 ${unavailableAttendees.length}명`}
              className={
                constraintMessages.length > 0
                  ? "border-t border-border/60 pt-4"
                  : undefined
              }
            >
              <p className="tds-sub-typography-12 font-medium text-muted-foreground">
                참석 불가 {unavailableAttendees.length}명
              </p>
              <div className="mt-2 space-y-3">
                {unavailableAttendees.map((attendee) => (
                  <div
                    key={attendee.name}
                    className="flex items-center gap-2.5"
                  >
                    <img
                      src={attendee.avatar}
                      alt=""
                      className="size-8 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="tds-sub-typography-11 font-medium">
                        {attendee.name}
                        <span
                          className={`ml-1.5 tds-sub-typography-12 font-medium ${attendee.role === "필수" ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {attendee.role}
                        </span>
                      </p>
                      <p className="truncate tds-sub-typography-12 text-muted-foreground">
                        {attendee.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  )
}
