import { useEffect, useState } from "react";
import { Accessibility, Check, Globe, Minus, Moon, Plus, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LOCALES, type LocaleCode } from "@/lib/i18n/config";

type FontSize = "normal" | "large" | "xlarge";
const DARK_KEY = "a11y:dark-mode";

function applyDark(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", on);
}

const FONT_KEY = "a11y:font-size";
const CONTRAST_KEY = "a11y:high-contrast";

const FONT_CLASS: Record<FontSize, string> = {
  normal: "",
  large: "a11y-font-lg",
  xlarge: "a11y-font-xl",
};

function applyFont(size: FontSize) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("a11y-font-lg", "a11y-font-xl");
  if (FONT_CLASS[size]) root.classList.add(FONT_CLASS[size]);
}

function applyContrast(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("high-contrast", on);
}

export function AccessibilityControls() {
  const [font, setFont] = useState<FontSize>("normal");
  const [contrast, setContrast] = useState(false);
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const { locale, setLocale } = useLanguage();

  // Hydrate from storage on mount
  useEffect(() => {
    try {
      const savedFont = (localStorage.getItem(FONT_KEY) as FontSize | null) ?? "normal";
      const savedContrast = localStorage.getItem(CONTRAST_KEY) === "1";
      const savedDarkRaw = localStorage.getItem(DARK_KEY);
      const savedDark = savedDarkRaw === "1";
      setFont(savedFont);
      setContrast(savedContrast);
      setDark(savedDark);
      applyFont(savedFont);
      applyContrast(savedContrast);
      applyDark(savedDark);
    } catch {
      /* ignore */
    }
  }, []);

  const updateFont = (next: FontSize) => {
    setFont(next);
    applyFont(next);
    try {
      localStorage.setItem(FONT_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const updateContrast = (next: boolean) => {
    setContrast(next);
    applyContrast(next);
    try {
      localStorage.setItem(CONTRAST_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const updateDark = (next: boolean) => {
    setDark(next);
    applyDark(next);
    try {
      localStorage.setItem(DARK_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    updateFont("normal");
    updateContrast(false);
    updateDark(false);
  };

  const sizes: { id: FontSize; label: string }[] = [
    { id: "normal", label: "A" },
    { id: "large", label: "A+" },
    { id: "xlarge", label: "A++" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="icon"
          aria-label="Open accessibility settings"
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Accessibility className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-72 space-y-4"
        aria-label="Accessibility settings"
        data-i18n-skip
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">Accessibility</h2>
          <p className="text-xs text-muted-foreground">
            Adjust text size, contrast, and language. Your choices are saved on this device.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="a11y-language" className="flex items-center gap-1.5 text-sm">
            <Globe className="h-3.5 w-3.5" />
            Language
          </Label>
          <Select value={locale} onValueChange={(v) => setLocale(v as LocaleCode)}>
            <SelectTrigger id="a11y-language" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.nativeLabel}
                  {l.code !== "en" ? (
                    <span className="ml-2 text-xs text-muted-foreground">({l.label})</span>
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Non-English translations are AI-generated and may need review.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Text size</Label>
          <div
            role="radiogroup"
            aria-label="Text size"
            className="grid grid-cols-3 gap-2"
          >
            {sizes.map((s, i) => (
              <Button
                key={s.id}
                role="radio"
                aria-checked={font === s.id}
                variant={font === s.id ? "default" : "outline"}
                onClick={() => updateFont(s.id)}
                className={cn(
                  "h-10",
                  i === 0 && "text-sm",
                  i === 1 && "text-base",
                  i === 2 && "text-lg",
                )}
              >
                {i === 0 ? <Minus className="h-3 w-3" /> : null}
                {s.label}
                {i === 2 ? <Plus className="h-3 w-3" /> : null}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="a11y-contrast" className="text-sm">
              High contrast
            </Label>
            <p className="text-xs text-muted-foreground">
              Darker text, stronger borders.
            </p>
          </div>
          <Switch
            id="a11y-contrast"
            checked={contrast}
            onCheckedChange={updateContrast}
            aria-label="Toggle high contrast mode"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="a11y-dark" className="flex items-center gap-1.5 text-sm">
              <Moon className="h-3.5 w-3.5" />
              Dark mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Switch to a darker color scheme.
            </p>
          </div>
          <Switch
            id="a11y-dark"
            checked={dark}
            onCheckedChange={updateDark}
            aria-label="Toggle dark mode"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            <Check className="h-3 w-3" />
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
