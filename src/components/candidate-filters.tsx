import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type CandidateRules = {
  attendeeMode: "all" | "required"
  selectedParticipantNames: string[]
  requiredParticipantNames: string[]
  businessHoursOnly: boolean
  respectPreferences: boolean
  roomAvailableOnly: boolean
}

type CandidateFiltersProps = {
  value: CandidateRules
  roomSelected?: boolean
  onValueChange: (value: CandidateRules) => void
}

const optionFilters: Array<{
  key: "businessHoursOnly" | "respectPreferences" | "roomAvailableOnly"
  label: string
}> = [
  { key: "businessHoursOnly", label: "업무 시간 내" },
  { key: "respectPreferences", label: "비선호 시간 제외" },
  { key: "roomAvailableOnly", label: "회의실 사용 가능" },
]

export function CandidateFilters({
  value,
  roomSelected = true,
  onValueChange,
}: CandidateFiltersProps) {
  return (
    <section aria-label="탐색 조건">
      <fieldset>
        <legend className="sr-only">참석 기준</legend>
        <RadioGroup
          value={value.attendeeMode}
          onValueChange={(attendeeMode) => {
            if (attendeeMode === "all" || attendeeMode === "required") {
              onValueChange({ ...value, attendeeMode })
            }
          }}
          className="flex gap-4 tds-sub-typography-11"
        >
          {(
            [
              ["all", "전체"],
              ["required", "필수만"],
            ] as const
          ).map(([mode, label]) => (
            <label
              key={mode}
              className="flex cursor-pointer items-center gap-1.5"
            >
              <RadioGroupItem value={mode} />
              {label}
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="mt-3 space-y-2">
        {optionFilters.map(({ key, label }) => {
          const disabled = key === "roomAvailableOnly" && !roomSelected

          return (
            <label
              key={key}
              className={`flex items-center gap-2 tds-sub-typography-11 ${disabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}`}
            >
              <Checkbox
                checked={value[key]}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onValueChange({ ...value, [key]: checked === true })
                }
              />
              {label}
            </label>
          )
        })}
      </div>
    </section>
  )
}
