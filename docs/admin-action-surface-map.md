# Admin Action → Product Surface Map

Phase 1 deliverable. Every Admin Hub action, and the exact public or signed-in
surface it changes. Use this when verifying a round-trip: make the change in the
Admin Hub, then confirm it appears (or disappears) on the listed surface.

| Admin Hub action | Route | Surface it changes | Visible to |
| --- | --- | --- | --- |
| Publish / unpublish a resource | `/owner/resources` | `/resources` library listing + role "Recommended resources" panels | Public + all signed-in roles |
| Verify or feature a resource | `/owner/resources` | Featured rail on `/resources`; boosted rank in student/family recommendations | Public + signed-in |
| Resolve a review-queue item | `/owner/resource-review` | Removes the item from Content Health; restores the resource to the public library | Public |
| Add / edit a resource source | `/owner/resource-sources` | Source attribution shown on resource cards and `/resources` source filter | Public |
| Publish a blog post | `/owner/blog` | `/blog` index + `/blog/$slug` detail | Public |
| Edit a page section | `/owner/content` | Corresponding marketing route (`/`, `/about`, `/platform`, `/pricing`) | Public |
| Upload media | `/owner/media` | Images referenced by page sections, blog posts, and resource cards | Public |
| Add / edit an FAQ | `/owner/faqs` | `/help` FAQ accordion | Public |
| Approve a testimonial | `/owner/testimonials` | Testimonial rails on `/` and `/platform` | Public |
| Approve a partner submission | `/owner/partner-submissions` | Partner appears in `/partners` directory and becomes matchable | Public + student/family matching |
| Edit a partner record | `/owner/partner-network` | `/partners` directory entry + partner detail; match explanations | Public + signed-in |
| Publish an opportunity | `/owner/opportunities` | Opportunity discovery for students/families; partner hub listing | Signed-in students, families, educators |
| Log partner outreach | `/owner/outreach` | Internal only — no public surface | Admins only |
| Create an organization | `/owner/organizations` | Org appears in access-code redemption, invitations, and Operator Console switcher | Org admins |
| Grant an entitlement | `/owner/organizations` | Unlocks family / student / partner features for every member of that org | All members of the org |
| Issue a pilot package | `/owner/pilot-packages` | Pilot org gains seats and time-boxed entitlement | Pilot org members |
| Route a waitlist entry | `/owner/waitlist` | Triggers the matching invitation email and the role door the user lands on | That individual |
| Invite an admin | `/owner/admins` | Grants Admin Hub access after MFA enrolment | That individual |
| Change a user role | `/owner/users` | Changes which hub and dashboards that user sees on sign-in | That individual |
| Toggle maintenance mode / waitlist | `/owner/settings` | Site-wide banner + whether `/waitlist` accepts submissions | Public |
| Update launch checklist | `/owner/launch` | Launch status badge on the Admin Hub dashboard | Admins only |
| Revoke exceptional access | `/owner/support-access` | Immediately invalidates an admin's short-lived student-document grant | That admin |
| Re-run content checks | `/owner/content-health` | Read-only; drives the queues above | Admins only |

## Exceptional access rules

- Platform admins have **no** routine read path to student documents, IEP
  content, or Pathway Report bodies.
- An override requires a reason (≥ 8 characters), a scope
  (`single_document`, `compliance_audit`, `support_ticket`, `data_request`),
  and an optional case reference. It expires automatically after 15 minutes.
- The grant row is immutable: a database trigger blocks every update except a
  single revocation, and blocks deletion entirely.
- Each override also writes to `document_access_log` and `audit_log`, and the
  student's own access-history page shows the event.
- `/owner/support-access` shows accountability metadata only — never a student
  name, document title, or plan content.
