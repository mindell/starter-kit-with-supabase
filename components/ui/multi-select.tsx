"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
  placeholder?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select items...",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleClickOutside = React.useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setOpen(false)
    }
  }, [])

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [handleClickOutside])

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  return (
    <Command className={cn("overflow-visible bg-transparent", className)}>
      <div
        ref={containerRef}
        className="relative w-full"
      >
        <div
          className="group rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          role="combobox"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setOpen(true)
            }
            if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          tabIndex={0}
        >
          <div className="flex flex-wrap gap-1">
            {selected.map((item) => {
              const option = options.find((o) => o.value === item)
              return (
                <Badge
                  key={item}
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {option?.label}
                  <button
                    className="ml-1 rounded-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={() => handleUnselect(item)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">Remove {option?.label}</span>
                  </button>
                </Badge>
              )
            })}
            {selected.length === 0 && (
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
        {open && (
          <div
            className="absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
            role="listbox"
            aria-multiselectable="true"
          >
            <CommandGroup className="max-h-[200px] overflow-auto">
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(selected.filter((i) => i !== option.value))
                      } else {
                        onChange([...selected, option.value])
                      }
                    }}
                    className={cn(
                      "aria-selected:bg-primary aria-selected:text-primary-foreground",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                  >
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  )
}
