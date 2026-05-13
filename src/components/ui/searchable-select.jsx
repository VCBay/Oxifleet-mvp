import * as React from "react"

import { Input } from "./input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

function defaultFilter(option, query) {
  const term = query.trim().toLowerCase()
  if (!term) return true
  const searchable = [
    option.label,
    option.description,
    option.meta,
    option.subLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return searchable.includes(term)
}

function defaultRenderOption(option) {
  return option.label
}

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search...",
  emptyLabel = "No items available",
  noMatchLabel = "No matches found",
  renderOption,
  renderTriggerValue,
  filterOption,
  triggerClassName,
  contentClassName,
  onOpenChange,
  searchInputProps,
  ...rest
}) {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const filterFn = filterOption || defaultFilter
  const filteredOptions = React.useMemo(
    () => options.filter((option) => filterFn(option, query)),
    [options, query, filterFn]
  )
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  )
  const triggerValue = renderTriggerValue
    ? renderTriggerValue(selectedOption)
    : selectedOption?.label
  React.useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        onOpenChange?.(isOpen)
      }}
      {...rest}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder}>{triggerValue}</SelectValue>
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <div className="px-3 pt-3">
          <Input
            aria-label="Search select options"
            className="h-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            value={query}
            {...searchInputProps}
          />
        </div>
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-500">
            {options.length === 0 ? emptyLabel : noMatchLabel}
          </p>
        ) : (
          filteredOptions.map((option) => (
            <SelectItem
              disabled={option.disabled}
              key={option.key ?? option.value}
              textValue={option.label}
              value={option.value}
            >
              {renderOption ? renderOption(option, option.value === value) : defaultRenderOption(option)}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

export { SearchableSelect }
