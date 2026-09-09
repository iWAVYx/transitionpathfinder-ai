import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const policy = read("src/lib/protected-file-uploads.ts");
const documents = read("src/lib/documents.functions.ts");
const familyUpload = read("src/components/students/FamilyDocumentUpload.tsx");
const pathwayIepUpload = read("src/components/pathway/IepUpload.tsx");
const channelMessages = read("src/lib/channel-messages.functions.ts");
const channelRoute = read("src/routes/_authenticated/transition-channel.tsx");
const documentsRoute = read("src/routes/_authenticated/documents.tsx");
const ownerTestingScripts = read("src/lib/owner/testing-scripts.functions.ts");
const cms = read("src/lib/cms/cms.functions.ts");

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

test("protected file uploads use one explicit fail-closed policy", () => {
  assert.match(policy, /export const PROTECTED_FILE_UPLOADS_ENABLED = false/);
  assert.match(policy, /private malware scanning is being finalized/);
  assert.match(
    policy,
    /if \(!PROTECTED_FILE_UPLOADS_ENABLED\)[\s\S]{0,120}?throw new Error\(PROTECTED_FILE_UPLOADS_MESSAGE\)/,
  );
  assert.doesNotMatch(policy, /process\.env|import\.meta\.env|localStorage|sessionStorage/);
});

test("document upload preflight and registration reject before trusted data work", () => {
  const registration = section(
    documents,
    "export const registerDocument",
    "export const archiveDocument",
  );
  const preflight = section(
    documents,
    "export const assertCanUploadForStudent",
    "export const getDocumentSignedUrl",
  );

  const registrationGate = registration.indexOf("assertProtectedFileUploadsEnabled()");
  const registrationData = registration.indexOf("const { supabase, userId } = context");
  assert.ok(registrationGate >= 0 && registrationData > registrationGate);

  const preflightGate = preflight.indexOf("assertProtectedFileUploadsEnabled()");
  const preflightData = preflight.indexOf("const { supabase, userId } = context");
  assert.ok(preflightGate >= 0 && preflightData > preflightGate);

  const clientGuard = familyUpload.indexOf("if (!PROTECTED_FILE_UPLOADS_ENABLED)");
  const serverPreflight = familyUpload.indexOf("await assertCanUpload");
  const storageWrite = familyUpload.indexOf('.from("student-documents")');
  assert.ok(clientGuard >= 0 && serverPreflight > clientGuard && storageWrite > serverPreflight);
});

test("document and IEP screens explain the pause while existing work stays reachable", () => {
  assert.match(
    familyUpload,
    /canEdit && !PROTECTED_FILE_UPLOADS_ENABLED[\s\S]{0,500}?Document uploads are temporarily paused/,
  );
  assert.match(familyUpload, /canEdit && PROTECTED_FILE_UPLOADS_ENABLED/);
  assert.match(familyUpload, /reviewing documents that are already available/);
  assert.match(documentsRoute, /New document uploads are temporarily paused/);
  assert.match(documentsRoute, /Documents already here remain available/);

  assert.match(pathwayIepUpload, /disabled=\{loading \|\| !PROTECTED_FILE_UPLOADS_ENABLED\}/);
  assert.match(pathwayIepUpload, /IEP file selection is temporarily unavailable/);
  assert.match(pathwayIepUpload, /name: "Pasted IEP text", text: pasted/);
  assert.match(pathwayIepUpload, /onConfirm=\{\(\{ text \}\) =>/);
});

test("Transition Channel blocks attachment authorization without blocking messaging or cleanup", () => {
  const registration = section(
    channelMessages,
    "export const prepareChannelAttachmentUpload",
    "export const failChannelAttachmentUpload",
  );
  const cleanup = section(
    channelMessages,
    "export const failChannelAttachmentUpload",
    "export const scanChannelAttachment",
  );

  const gate = registration.indexOf("assertProtectedFileUploadsEnabled()");
  const lookup = registration.indexOf("const { supabase, userId } = context");
  const token = registration.indexOf("createSignedUploadUrl");
  assert.ok(gate >= 0 && lookup > gate && token > lookup);
  assert.doesNotMatch(cleanup, /assertProtectedFileUploadsEnabled/);

  assert.match(
    channelRoute,
    /disabled=\{!PROTECTED_FILE_UPLOADS_ENABLED \|\| !!active\.archived_at\}/,
  );
  assert.match(channelRoute, /Attachments are temporarily unavailable/);
  assert.match(channelRoute, /You can still send messages normally/);
  assert.match(channelRoute, /attachment: PROTECTED_FILE_UPLOADS_ENABLED \? pendingFile : null/);

  const sendFlow = section(channelRoute, "const sendMutation = useMutation", "const pinned =");
  assert.match(sendFlow, /const res = await sendFn/);
  assert.doesNotMatch(sendFlow, /assertProtectedFileUploadsEnabled/);
});

test("operator guidance follows the temporary gate and owner site media stays out of scope", () => {
  assert.match(ownerTestingScripts, /title: "Verify upload safety gate"/);
  assert.match(ownerTestingScripts, /existing documents remain readable by authorized users/);
  assert.match(cms, /export const adminUploadMedia = createServerFn/);
  assert.match(cms, /\.from\("site-media"\)/);
  assert.doesNotMatch(cms, /protected-file-uploads|PROTECTED_FILE_UPLOADS_ENABLED/);
});
