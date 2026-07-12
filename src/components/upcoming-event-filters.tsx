import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type UpcomingEventFilter = "all" | "meeting" | "personal"

type UpcomingEventFiltersProps = {
  value: UpcomingEventFilter
  onValueChange: (value: UpcomingEventFilter) => void
}

const filterLabels: Record<UpcomingEventFilter, string> = {
  all: "전체",
  meeting: "회의",
  personal: "개인",
}

export function UpcomingEventFilters({
  value,
  onValueChange,
}: UpcomingEventFiltersProps) {
  return (
    <fieldset>
      <legend className="sr-only">일정 필터</legend>
      <RadioGroup
        value={value}
        onValueChange={(nextValue) => {
          if (
            nextValue === "all" ||
            nextValue === "meeting" ||
            nextValue === "personal"
          ) {
            onValueChange(nextValue)
          }
        }}
        className="flex gap-4 tds-sub-typography-11"
      >
        {(Object.keys(filterLabels) as UpcomingEventFilter[]).map((filter) => (
          <label
            key={filter}
            className="flex cursor-pointer items-center gap-1.5"
          >
            <RadioGroupItem value={filter} />
            {filterLabels[filter]}
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
