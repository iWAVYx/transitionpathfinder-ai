/** Read-only acceptance must report missing fixtures, never prepare them implicitly. */
export function assertRoleFixtureWriteAllowed(role: string, readOnly = process.env.E2E_READ_ONLY) {
  if (readOnly === "true" || readOnly === "1") {
    throw new Error(`Read-only role acceptance: ${role} needs a prepared onboarding/workspace fixture. No records were created or changed.`);
  }
}
