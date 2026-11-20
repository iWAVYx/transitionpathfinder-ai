import { z } from "zod";
import {
  prepareConnectionCreateV1,
  confirmConnectionCreateV1,
  confirmConnectionLookupV1,
} from "./channel-connection-v1-create-contract";
import {
  prepareConnectionDecisionV1,
  confirmConnectionDecisionV1,
} from "./channel-connection-v1-decision-contract";
import { validateConnectionTargetsV1 } from "./channel-connection-v1-contract";

// DORMANT: no production dependencies, endpoint, UI imports or activation switch.
// Future assembly must supply fresh authenticated caller-RLS context and reviewed
// server readiness checks. Role/membership/consent authority remains in the RPCs.
type CreateArgs = ReturnType<typeof prepareConnectionCreateV1>["params"];
type DecisionArgs = { p_request: string; p_expected_revision: number; p_operation_key: string };
export type ConnectionV1RpcArgs = {
  tf_connection_create_v1: CreateArgs;
  tf_connection_lookup_v1: { p_client_key: string };
  tf_connection_respond_v1: DecisionArgs & { p_decision: "accepted" | "declined" };
  tf_connection_withdraw_v1: DecisionArgs;
  tf_connection_targets_v1: {
    p_source_organization: string;
    p_after: string | null;
    p_limit: number;
  };
};
type Operation = keyof ConnectionV1RpcArgs;
export type ConnectionV1Caller = {
  userId: string;
  rpc: <K extends Operation>(
    name: K,
    args: ConnectionV1RpcArgs[K],
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};
type Dependencies = {
  authenticate: () => Promise<ConnectionV1Caller>;
  // Required server-owned port; never accept readiness from request data.
  requireProtocol: (caller: ConnectionV1Caller, operation: Operation) => Promise<boolean>;
};
export class ConnectionV1AdapterError extends Error {
  constructor(
    public readonly code:
      | "authentication_required"
      | "viewer_changed"
      | "protocol_unavailable"
      | "read_unavailable"
      | "outcome_unconfirmed",
    public readonly recovery: "sign_in" | "reload" | "lookup_same_key" | "reload_same_request",
  ) {
    super(
      code === "outcome_unconfirmed"
        ? "We couldn't confirm the saved result. Check the original request before trying again."
        : "We couldn't verify this connection request. Reload before continuing.",
    );
    this.name = "ConnectionV1AdapterError";
  }
}
const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const targetsSchema = z
  .object({
    expected_viewer_id: uuid,
    source_organization_id: uuid,
    after: uuid.nullable(),
    limit: z.number().int().min(1).max(100),
  })
  .strict();
const lookupSchema = z
  .object({ intent: z.unknown(), expected_request_id: uuid.optional() })
  .strict();

export function createConnectionV1ServerAdapter(dependencies: Dependencies) {
  async function authenticate(expectedViewer: string, operation: Operation) {
    let caller: ConnectionV1Caller;
    try {
      const authenticated = await dependencies.authenticate();
      // Detach the identity from a mutable dependency object before awaiting gates.
      caller = Object.freeze({
        userId: uuid.parse(authenticated.userId),
        rpc: authenticated.rpc.bind(authenticated),
      });
    } catch {
      throw new ConnectionV1AdapterError("authentication_required", "sign_in");
    }
    if (caller.userId !== expectedViewer)
      throw new ConnectionV1AdapterError("viewer_changed", "reload");
    try {
      if ((await dependencies.requireProtocol(caller, operation)) !== true)
        throw new Error("Protocol readiness was not confirmed");
    } catch {
      throw new ConnectionV1AdapterError("protocol_unavailable", "reload");
    }
    return caller;
  }
  async function call<K extends Operation, T>(
    caller: ConnectionV1Caller,
    name: K,
    args: ConnectionV1RpcArgs[K],
    confirm: (data: unknown) => T,
    recovery: "lookup_same_key" | "reload_same_request" | null,
  ) {
    try {
      const reply = await caller.rpc(name, args);
      if (!reply || !("data" in reply) || reply.error !== null)
        throw new Error("Unconfirmed RPC reply");
      return confirm(reply.data);
    } catch {
      // No raw database error, payload or credentials in caller-visible errors.
      // In particular, an uncertain write never becomes an automatic retry.
      throw new ConnectionV1AdapterError(
        recovery ? "outcome_unconfirmed" : "read_unavailable",
        recovery ?? "reload",
      );
    }
  }
  return Object.freeze({
    async create(value: unknown) {
      const intent = prepareConnectionCreateV1(value);
      const caller = await authenticate(intent.original.expected_viewer_id, intent.rpc);
      return call(
        caller,
        intent.rpc,
        intent.params,
        (data) => confirmConnectionCreateV1(data, intent, caller.userId),
        "lookup_same_key",
      );
    },
    async lookup(value: unknown) {
      const input = lookupSchema.parse(value);
      const intent = prepareConnectionCreateV1(input.intent);
      const caller = await authenticate(intent.original.expected_viewer_id, intent.lookup.rpc);
      return call(
        caller,
        intent.lookup.rpc,
        intent.lookup.params,
        (data) => confirmConnectionLookupV1(data, intent, caller.userId, input.expected_request_id),
        null,
      );
    },
    async decide(value: unknown) {
      const intent = prepareConnectionDecisionV1(value);
      const caller = await authenticate(intent.expected_viewer_id, intent.rpc);
      const args = {
        p_request: intent.params.p_request,
        p_expected_revision: intent.params.p_expected_revision,
        p_operation_key: intent.params.p_operation_key,
      };
      const confirm = (data: unknown) => confirmConnectionDecisionV1(data, intent, caller.userId);
      return intent.action === "withdraw"
        ? call(caller, "tf_connection_withdraw_v1", args, confirm, "reload_same_request")
        : call(
            caller,
            "tf_connection_respond_v1",
            { ...args, p_decision: z.enum(["accepted", "declined"]).parse(intent.decision) },
            confirm,
            "reload_same_request",
          );
    },
    async targets(value: unknown) {
      const input = targetsSchema.parse(value);
      const caller = await authenticate(input.expected_viewer_id, "tf_connection_targets_v1");
      return call(
        caller,
        "tf_connection_targets_v1",
        {
          p_source_organization: input.source_organization_id,
          p_after: input.after,
          p_limit: input.limit,
        },
        (data) =>
          validateConnectionTargetsV1(data, {
            sourceOrganizationId: input.source_organization_id,
            after: input.after,
            limit: input.limit,
          }),
        null,
      );
    },
  });
}
