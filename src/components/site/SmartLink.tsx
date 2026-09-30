import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Shared navigation link; returning to a page preserves its saved position. */
export function SmartLink({
  to,
  reload,
  onClick,
  children,
  ...rest
}: {
  to: string;
  reload?: boolean;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "to" | "onClick"> & {
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) {
  const href = useRouterState({ select: (s) => s.location.href });
  const isCurrent = href === to && !rest.search && !rest.hash;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isCurrent && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
    }
    onClick?.(e);
  };

  return (
    <Link to={to} {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}
