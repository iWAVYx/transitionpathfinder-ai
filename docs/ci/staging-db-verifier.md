# Staging Database Verifier

The staging billing workflow connects through a dedicated catalog-only login.
It does not use the Supabase project's `postgres` password and has no table or
sequence privileges.

## Activate Or Rotate The Login

Open the SQL Editor for Supabase project `qgrertkqbwanerqqemph` and run the
following statement after replacing the placeholder with a unique password.
Use at least 24 letters and numbers so no SQL or URL escaping is required.

```sql
alter role staging_billing_verifier
  with login password 'REPLACE_WITH_A_UNIQUE_ALPHANUMERIC_PASSWORD';
```

Save that same raw value as the `STAGING_DB_VERIFIER_PASSWORD` environment
secret under GitHub's `staging` environment. Do not add quotes, a connection
URL, or the role name to the GitHub secret.

## Disable The Login

```sql
alter role staging_billing_verifier nologin;
```

The role is staging-only. Its fixed project-qualified pooler username is
`staging_billing_verifier.qgrertkqbwanerqqemph`.
