import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type AttendeeRole = "required" | "optional"

export type AttendeePickerUser = {
  id: string
  name: string
  email: string
  avatar: string
}

export type Attendee = AttendeePickerUser & {
  role: AttendeeRole
}

type AttendeePickerProps = {
  users: AttendeePickerUser[]
  value: Attendee[]
  onValueChange: (attendees: Attendee[]) => void
  organizerId?: string
  defaultSelectedListOpen?: boolean
}

export function AttendeePicker({
  users,
  value,
  onValueChange,
  organizerId,
  defaultSelectedListOpen = true,
}: AttendeePickerProps) {
  const [query, setQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [activeResultIndex, setActiveResultIndex] = useState(-1)
  const [isSelectedListOpen, setIsSelectedListOpen] = useState(
    defaultSelectedListOpen
  )

  const matchedUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko")

    return users.filter((user) =>
      `${user.name} ${user.email}`
        .toLocaleLowerCase("ko")
        .includes(normalizedQuery)
    )
  }, [query, users])
  const selectableResultIndexes = matchedUsers.flatMap((user, index) =>
    value.some((attendee) => attendee.id === user.id) ? [] : [index]
  )
  const activeUser = matchedUsers[activeResultIndex]
  const isSearchOpen = isSearchFocused

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (target instanceof Node && !pickerRef.current?.contains(target)) {
        setIsSearchFocused(false)
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointerDown)
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown)
  }, [])

  const requiredAttendees = value.filter(
    (attendee) => attendee.role === "required"
  )
  const optionalAttendees = value.filter(
    (attendee) => attendee.role === "optional"
  )

  const addAttendee = (user: AttendeePickerUser) => {
    if (value.some((attendee) => attendee.id === user.id)) return

    const nextAttendees: Attendee[] = [...value, { ...user, role: "required" }]

    onValueChange(nextAttendees)
    setActiveResultIndex(-1)
  }

  const moveActiveResult = (direction: 1 | -1) => {
    if (selectableResultIndexes.length === 0) return

    const currentPosition = selectableResultIndexes.indexOf(activeResultIndex)
    const nextPosition =
      currentPosition === -1
        ? direction === 1
          ? 0
          : selectableResultIndexes.length - 1
        : (currentPosition + direction + selectableResultIndexes.length) %
          selectableResultIndexes.length

    setActiveResultIndex(selectableResultIndexes[nextPosition])
  }

  const removeAttendee = (id: string) => {
    onValueChange(value.filter((attendee) => attendee.id !== id))
  }

  const updateAttendeeRole = (id: string, role: AttendeeRole) => {
    onValueChange(
      value.map((attendee) =>
        attendee.id === id ? { ...attendee, role } : attendee
      )
    )
  }

  const closeSearch = () => {
    setQuery("")
    setIsSearchFocused(false)
    setActiveResultIndex(-1)
  }

  return (
    <div ref={pickerRef} className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          role="combobox"
          aria-label="참석자 추가"
          aria-autocomplete="list"
          aria-controls="attendee-search-results"
          aria-expanded={isSearchOpen}
          aria-activedescendant={
            activeUser != null ? `attendee-option-${activeUser.id}` : undefined
          }
          value={query}
          placeholder="참석자 추가"
          className="h-10 pr-9 pl-9"
          onFocus={() => {
            setIsSearchFocused(true)
            setActiveResultIndex(-1)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveResultIndex(-1)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              moveActiveResult(1)
              return
            }

            if (event.key === "ArrowUp") {
              event.preventDefault()
              moveActiveResult(-1)
              return
            }

            if (event.key === "Escape") {
              closeSearch()
              return
            }

            if (event.key === "Enter" && activeUser != null) {
              event.preventDefault()
              addAttendee(activeUser)
            }
          }}
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="검색어 지우기"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onMouseDown={(event) => event.preventDefault()}
            onClick={closeSearch}
          >
            <X aria-hidden />
          </Button>
        )}
        {isSearchOpen && (
          <section
            id="attendee-search-results"
            role="listbox"
            aria-label="사용자 검색 결과"
            className="absolute z-10 mt-1 max-h-72 w-full overflow-hidden rounded-lg border bg-popover"
          >
            {query && (
              <p className="border-b px-3 py-2 tds-sub-typography-11 font-medium text-muted-foreground">
                검색 결과
              </p>
            )}
            <div className="max-h-72 overflow-y-auto p-1">
              {matchedUsers.length > 0 ? (
                matchedUsers.map((user, index) => {
                  const isAdded = value.some(
                    (attendee) => attendee.id === user.id
                  )

                  return (
                    <button
                      id={`attendee-option-${user.id}`}
                      key={user.id}
                      type="button"
                      role="option"
                      aria-selected={isAdded}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left tds-sub-typography-11 outline-none hover:bg-muted focus-visible:bg-muted ${
                        activeResultIndex === index ? "bg-muted" : ""
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        isAdded ? removeAttendee(user.id) : addAttendee(user)
                      }
                    >
                      <Avatar size="sm" aria-hidden>
                        <AvatarImage src={user.avatar} alt="" />
                        <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0">
                        <span>{user.name}</span>
                        <span className="truncate tds-sub-typography-12 text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                      {isAdded && (
                        <Check
                          aria-hidden
                          className="ml-auto size-4 text-primary"
                        />
                      )}
                    </button>
                  )
                })
              ) : (
                <p className="px-2 py-6 text-center tds-sub-typography-11 text-muted-foreground">
                  일치하는 사용자가 없어요
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <section aria-label="선택한 참석자">
        <Button
          type="button"
          variant="ghost"
          className={`h-10 w-full justify-between rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 tds-sub-typography-11 font-normal hover:bg-transparent aria-expanded:bg-transparent aria-expanded:text-foreground ${
            isSelectedListOpen ? "rounded-b-none" : ""
          }`}
          aria-expanded={isSelectedListOpen}
          onClick={() => setIsSelectedListOpen((open) => !open)}
        >
          <span className="flex items-center gap-2">
            <span>참석자 {value.length}명</span>
            {!isSelectedListOpen && value.length > 0 && (
              <AvatarGroup aria-hidden>
                {value.slice(0, 4).map((attendee) => (
                  <Avatar key={attendee.id} size="sm">
                    <AvatarImage src={attendee.avatar} alt="" />
                    <AvatarFallback>{attendee.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                ))}
                {value.length > 4 && (
                  <AvatarGroupCount>+{value.length - 4}</AvatarGroupCount>
                )}
              </AvatarGroup>
            )}
          </span>
          <ChevronDown
            aria-hidden
            className={`size-4 text-muted-foreground ${
              isSelectedListOpen ? "rotate-180" : ""
            }`}
          />
        </Button>
        {isSelectedListOpen && (
          <div className="rounded-b-lg border border-t-0 p-2">
            <AttendeeGroup
              attendees={requiredAttendees}
              title="필수 참석자"
              onRemove={removeAttendee}
              onRoleChange={updateAttendeeRole}
              organizerId={organizerId}
            />
            <AttendeeGroup
              attendees={optionalAttendees}
              title="선택 참석자"
              onRemove={removeAttendee}
              onRoleChange={updateAttendeeRole}
              organizerId={organizerId}
            />
            {value.length === 0 && (
              <p className="px-2 py-6 text-center tds-sub-typography-11 text-muted-foreground">
                참석자를 검색해 추가하세요
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function AttendeeGroup({
  attendees,
  title,
  onRemove,
  onRoleChange,
  organizerId,
}: {
  attendees: Attendee[]
  title: string
  onRemove: (id: string) => void
  onRoleChange: (id: string, role: AttendeeRole) => void
  organizerId?: string
}) {
  if (attendees.length === 0) return null

  return (
    <section className="py-1 first:pt-0 last:pb-0">
      <p className="px-2 py-1.5 tds-sub-typography-12 font-medium text-muted-foreground">
        {title} {attendees.length}명
      </p>
      <div className="space-y-1">
        {attendees.map((attendee) => {
          const isOrganizer = attendee.id === organizerId

          return (
            <div
              key={attendee.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
            >
              <Avatar size="sm" aria-hidden>
                <AvatarImage src={attendee.avatar} alt="" />
                <AvatarFallback>{attendee.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate tds-sub-typography-11">
                <span className="truncate">{attendee.name}</span>
                {isOrganizer && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 tds-sub-typography-13"
                  >
                    주최자
                  </Badge>
                )}
              </span>
              <div className="-mr-1 flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  aria-label={`${attendee.name}을 ${attendee.role === "required" ? "선택" : "필수"} 참석자로 변경`}
                  className={
                    attendee.role === "required"
                      ? "px-1 text-primary no-underline hover:no-underline"
                      : "px-1 text-muted-foreground no-underline hover:no-underline"
                  }
                  onClick={() =>
                    onRoleChange(
                      attendee.id,
                      attendee.role === "required" ? "optional" : "required"
                    )
                  }
                >
                  {attendee.role === "required" ? "필수" : "선택"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="icon-xs"
                  aria-label={`${attendee.name} 제거`}
                  className="text-muted-foreground no-underline hover:text-muted-foreground hover:no-underline"
                  onClick={() => onRemove(attendee.id)}
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
