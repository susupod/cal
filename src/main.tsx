/* eslint-disable react-refresh/only-export-components */

import { StrictMode, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"

import { TooltipProvider } from "@/components/ui/tooltip"
import App from "./App.tsx"
import { UiShowcase } from "./UiShowcase.tsx"
import "./index.css"

const Component = location.pathname === "/ui-showcase" ? UiShowcase : App

createRoot(document.getElementById("root")!).render(
  createElement(
    StrictMode,
    null,
    createElement(
      TooltipProvider,
      null,
      createElement(Component),
      createElement(Toaster, {
        position: "bottom-right",
        richColors: false,
        theme: "light",
        toastOptions: {
          classNames: {
            toast:
              "!ml-auto !w-fit !max-w-[360px] !rounded-xl !border-0 !bg-foreground !px-4 !py-3 !text-background !shadow-xl",
            title: "!text-background tds-sub-typography-11 !font-semibold",
            description:
              "!text-background/70 tds-sub-typography-12 !font-normal",
            icon: "!text-success",
          },
        },
      })
    )
  )
)
