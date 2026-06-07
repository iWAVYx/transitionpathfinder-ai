import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Megaphone, ExternalLink } from "lucide-react";
import {
  dismissAnnouncement,
  listMyAnnouncements,
  trackAnnouncementClick,
  trackAnnouncementView,
} from "@/lib/broadcasts.functions";

type Item = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  severity: "info" | "success" | "warning" | "critical";
  created_at: string;
  expires_at: string | null;
  target_roles: string[];
  dismissed: boolean;
};

const SEV_STYLES: Record<Item["severity"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

export function AnnouncementsBanner() {
  const list = useServerFn(listMyAnnouncements);
  const dismiss = useServerFn(dismissAnnouncement);
  const trackView = useServerFn(trackAnnouncementView);
  const trackClick = useServerFn(trackAnnouncementClick);
  const [items, setItems] = useState<Item[]>([]);
  const viewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    list()
      .then((r) => {
        if (cancelled) return;
        setItems((r.announcements as Item[]).filter((a) => !a.dismissed));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [list]);

  useEffect(() => {
    for (const a of items) {
      if (viewedRef.current.has(a.id)) continue;
      viewedRef.current.add(a.id);
      trackView({ data: { id: a.id } }).catch(() => {});
    }
  }, [items, trackView]);

  if (items.length === 0) return null;

  const onDismiss = async (id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    try {
      await dismiss({ data: { id } });
    } catch {
      /* noop */
    }
  };

  const onClickLink = (a: Item) => {
    trackClick({ data: { id: a.id, link_url: a.link_url ?? undefined } }).catch(() => {});
  };

  return (
    <div className="mb-4 space-y-2">
      {items.map((a) => (
        <div
          key={a.id}
          className={
            "flex items-start gap-3 rounded-lg border px-4 py-3 " + SEV_STYLES[a.severity]
          }
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{a.title}</div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm opacity-90">{a.body}</p>
            {a.link_url && (
              <a
                href={a.link_url}
                target="_blank"
                rel="noreferrer"
                onClick={() => onClickLink(a)}
                onAuxClick={() => onClickLink(a)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
              >
                {a.link_label || "Learn more"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(a.id)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}


type Item = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  severity: "info" | "success" | "warning" | "critical";
  created_at: string;
  expires_at: string | null;
  target_roles: string[];
  dismissed: boolean;
};

const SEV_STYLES: Record<Item["severity"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

export function AnnouncementsBanner() {
  const list = useServerFn(listMyAnnouncements);
  const dismiss = useServerFn(dismissAnnouncement);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    list()
      .then((r) => {
        if (cancelled) return;
        setItems((r.announcements as Item[]).filter((a) => !a.dismissed));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [list]);

  if (items.length === 0) return null;

  const onDismiss = async (id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    try {
      await dismiss({ data: { id } });
    } catch {
      /* noop */
    }
  };

  return (
    <div className="mb-4 space-y-2">
      {items.map((a) => (
        <div
          key={a.id}
          className={
            "flex items-start gap-3 rounded-lg border px-4 py-3 " + SEV_STYLES[a.severity]
          }
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{a.title}</div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm opacity-90">{a.body}</p>
            {a.link_url && (
              <a
                href={a.link_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
              >
                {a.link_label || "Learn more"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(a.id)}
            className="rounded p-1 hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
