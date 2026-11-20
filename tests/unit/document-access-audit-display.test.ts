import {it,expect} from "vitest";
import {documentAccessReasonLabel} from "../../src/lib/document-access-audit-display";
it("does not call unconfirmed access/file readiness a proven revocation",()=>{const value=documentAccessReasonLabel("unconfirmed_access_or_file_state");expect(value).toBe("Access or file status could not be confirmed.");expect(value).not.toMatch(/revoked|removed|_/);});
it("preserves the distinction of historical recorded removal",()=>{expect(documentAccessReasonLabel("revoked_access")).toBe("Access was recorded as removed.");expect(documentAccessReasonLabel("revoked_access_signed_url_attempt")).toBe("Access was recorded as removed.");});
it("does not display arbitrary private or coded reason metadata",()=>{expect(documentAccessReasonLabel("PRIVATE student notes or database_error")).toBe("Review the access attempt.");});
it.each([null,undefined,""])("leaves absent reason metadata blank (%s)",reason=>{expect(documentAccessReasonLabel(reason)).toBe("");});
