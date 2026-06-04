import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Home, HelpCircle, EyeOff } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CT_HIGH_SCHOOLS, SCHOOL_SENTINELS } from "@/lib/ct-high-schools";

const SENTINEL_OPTIONS = [
  { value: SCHOOL_SENTINELS.HOME_SCHOOLED, icon: Home },
  { value: SCHOOL_SENTINELS.OTHER, icon: HelpCircle },
  { value: SCHOOL_SENTINELS.NOT_LISTED, icon: HelpCircle },
  { value: SCHOOL_SENTINELS.PREFER_NOT, icon: EyeOff },
] as const;

const NEEDS_FREE_TEXT = new Set<string>([
  SCHOOL_SENTINELS.OTHER,
  SCHOOL_SENTINELS.NOT_LISTED,
]);

export interface SchoolPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Autocomplete picker for Connecticut high schools.
 *
 * - Type-ahead search across CT public, magnet, technical, and private high schools.
 * - Special options: Home Schooled, Other, Not Listed, Prefer Not to Say.
 * - When "Other" or "Not Listed" is selected, surfaces a free-text input
 *   so the school name can be typed manually. The free-text value is what
 *   gets passed back via onChange (the sentinel itself is replaced).
 */
export function SchoolPicker({
  value,
  onChange,
  id,
  placeholder = "Search Connecticut high schools…",
  className,
}: SchoolPickerProps) {
  const [open, setOpen] = useState(false);
  const [sentinel, setSentinel] = useState<string | null>(() => {
    const v = (value || "").trim();
    if (v && SENTINEL_OPTIONS.some((s) => s.value === v)) return v;
    return null;
  });

  const showFreeText = sentinel !== null && NEEDS_FREE_TEXT.has(sentinel);
  // What to display on the trigger button
  const displayValue = useMemo(() => {
    const v = (value || "").trim();
    if (!v) return placeholder;
    if (sentinel && NEEDS_FREE_TEXT.has(sentinel)) {
      return v || sentinel;
    }
    return v;
  }, [value, sentinel, placeholder]);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-50 w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Type a school name…" />
            <CommandList className="max-h-72">
              <CommandEmpty>
                No match. Pick "Not Listed" or "Other" to type it in.
              </CommandEmpty>
              <CommandGroup heading="Connecticut high schools">
                {CT_HIGH_SCHOOLS.map((school) => (
                  <CommandItem
                    key={school}
                    value={school}
                    onSelect={() => {
                      setSentinel(null);
                      onChange(school);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === school && !sentinel
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {school}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Other options">
                {SENTINEL_OPTIONS.map(({ value: sv, icon: Icon }) => (
                  <CommandItem
                    key={sv}
                    value={sv}
                    onSelect={() => {
                      setSentinel(sv);
                      // For Home Schooled / Prefer Not to Say, the sentinel
                      // string itself is the saved value. For Other / Not Listed,
                      // clear the value so the free-text input can be filled.
                      if (NEEDS_FREE_TEXT.has(sv)) {
                        onChange("");
                      } else {
                        onChange(sv);
                      }
                      setOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4 opacity-70" />
                    {sv}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showFreeText && (
        <Input
          value={value}
          maxLength={160}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type the school name"
          aria-label="School name"
        />
      )}
    </div>
  );
}
