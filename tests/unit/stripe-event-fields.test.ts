import { describe, expect, it } from "vitest";
import { subscriptionIdFromInvoice } from "../../src/lib/billing/stripe-event-fields";

describe("subscriptionIdFromInvoice", () => {
  it("reads the modern Basil invoice parent shape", () => {
    expect(
      subscriptionIdFromInvoice({
        parent: {
          subscription_details: {
            subscription: "sub_modern",
          },
        },
      }),
    ).toBe("sub_modern");
  });

  it("reads an expanded subscription object in the modern shape", () => {
    expect(
      subscriptionIdFromInvoice({
        parent: {
          subscription_details: {
            subscription: { id: "sub_expanded" },
          },
        },
      }),
    ).toBe("sub_expanded");
  });

  it("keeps compatibility with pre-Basil invoice events", () => {
    expect(subscriptionIdFromInvoice({ subscription: "sub_legacy" })).toBe(
      "sub_legacy",
    );
  });

  it("fails closed when the invoice is unrelated to a subscription", () => {
    expect(subscriptionIdFromInvoice({ parent: null })).toBeNull();
  });
});
