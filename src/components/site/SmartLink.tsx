import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * A Link that scrolls to the top (or reloads) when clicked while already
 * on the target route. Use this for nav/header links so repeated clicks
 * feel like a fresh page load.
 */
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCurrent = pathname === to;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isCurrent) {
      if (reload) {
        window.location.reload();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    onClick?.(e);
  };

  return (
    <Link to={to} {...rest} onClick={handleClick}>
      {children}
    </Link>
  );
}
