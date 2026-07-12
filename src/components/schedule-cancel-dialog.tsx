import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"

type ScheduleCancelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancel: () => void
}

export function ScheduleCancelDialog({
  open,
  onOpenChange,
  onCancel,
}: ScheduleCancelDialogProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1300] grid place-items-center bg-foreground/20 p-4"
      onClick={() => onOpenChange(false)}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-schedule-title"
        className="w-full max-w-sm rounded-2xl border bg-background p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="cancel-schedule-title"
          className="tds-sub-typography-10 font-semibold"
        >
          일정 만들기를 취소할까요?
        </h2>
        <p className="mt-2 tds-sub-typography-11 text-muted-foreground">
          입력한 내용이 모두 삭제돼요.
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10 flex-1"
            onClick={onCancel}
          >
            나가기
          </Button>
          <Button
            type="button"
            className="h-10 flex-1"
            onClick={() => onOpenChange(false)}
          >
            계속 만들기
          </Button>
        </div>
      </section>
    </div>,
    document.body
  )
}
