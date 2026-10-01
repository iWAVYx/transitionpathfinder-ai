import { describe, expect, it } from "vitest";
import { isOwnerHubHomePath } from "@/lib/owner/owner-hub-home-path";

describe("Owner Hub home navigation", () => {
  it.each(["/owner", "/owner/", "/admin", "/admin/"])(
    "treats %s as the Owner Hub management home",
    (pathname) => {
      expect(isOwnerHubHomePath(pathname)).toBe(true);
    },
  );

  it.each(["/owner/users", "/owner/analytics", "/admin/orgs", "/dashboard"])(
    "keeps the return link on the deeper route %s",
    (pathname) => {
      expect(isOwnerHubHomePath(pathname)).toBe(false);
    },
  );
});
