import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  assertPrivacySafeDerivedUpload,
  createPrivacySafeFileName,
  redactSensitiveText,
} from "../src/lib/sensitive-text-redaction.ts";

const read = (path) => readFileSync(path, "utf8");

test("known student identifiers and common direct identifiers are removed", () => {
  const input = [
    "Student: Jamie O'Neil",
    "School: North Valley High School",
    "DOB: 3/7/2010",
    "Student ID: CT-908172",
    "Parent email: family@example.org",
    "Parent phone: (860) 555-0199",
    "SSN: 123-45-6789",
    "Address: 45 Main Street, Hartford, CT 06103",
    "IEP meeting date: 9/18/2026",
  ].join("\n");

  const result = redactSensitiveText(input, {
    studentFirstName: "Jamie",
    studentLastName: "O'Neil",
    schoolName: "North Valley High School",
    dateOfBirth: "2010-03-07",
  });

  assert.doesNotMatch(result.text, /O'Neil|North Valley|3\/7\/2010|CT-908172/);
  assert.doesNotMatch(result.text, /family@example\.org|860\) 555-0199|123-45-6789/);
  assert.doesNotMatch(result.text, /45 Main Street/);
  assert.match(result.text, /Person name: \[REDACTED\]/);
  assert.match(result.text, /IEP meeting date: 9\/18\/2026/);
  assert.ok(result.report.total >= 8);
});

test("the report exposes categories and counts, never matched private values", () => {
  const privateValue = "private.student@example.org";
  const result = redactSensitiveText(`Contact ${privateValue}`);
  const serializedReport = JSON.stringify(result.report);

  assert.equal(result.report.counts.email, 1);
  assert.doesNotMatch(serializedReport, /private\.student|example\.org/);
  assert.equal(createPrivacySafeFileName(), "privacy-safe-document.txt");
});

test("protected endpoints can accept only the generic plain-text derived artifact", () => {
  assert.doesNotThrow(() =>
    assertPrivacySafeDerivedUpload("student-id/123-privacy-safe-document.txt", "text/plain"),
  );
  assert.throws(
    () => assertPrivacySafeDerivedUpload("Jamie-IEP.pdf", "application/pdf"),
    /Only a reviewed TransitionForward privacy-safe text copy/,
  );
  assert.throws(
    () => assertPrivacySafeDerivedUpload("privacy-safe-document.txt", "text/html"),
    /Only a reviewed TransitionForward privacy-safe text copy/,
  );
});

test("labeled family and student names are suggested even without profile context", () => {
  const result = redactSensitiveText(
    "Student name: Alex Rivera\nGuardian: Morgan Rivera\nStrength: self-advocacy",
  );

  assert.doesNotMatch(result.text, /Alex Rivera|Morgan Rivera/);
  assert.equal(result.report.counts.student_name, 2);
  assert.match(result.text, /Strength: self-advocacy/);
});

test("ordinary educational dates are preserved when they are not the known or labeled birth date", () => {
  const result = redactSensitiveText(
    "Service begins 10/1/2026. Annual review 4/3/2027. Date of birth: 06/08/2011.",
  );

  assert.match(result.text, /Service begins 10\/1\/2026/);
  assert.match(result.text, /Annual review 4\/3\/2027/);
  assert.doesNotMatch(result.text, /06\/08\/2011/);
});

test("all three sensitive file entry points require the privacy review", () => {
  const dialog = read("src/components/privacy/SensitiveFilePrivacyReviewDialog.tsx");
  const pathway = read("src/components/pathway/IepUpload.tsx");
  const family = read("src/components/students/FamilyDocumentUpload.tsx");
  const channel = read("src/routes/_authenticated/transition-channel.tsx");

  assert.match(dialog, /I reviewed this copy and removed any remaining personal details/);
  assert.match(dialog, /createPrivacySafeTextFile\(reviewText\)/);
  assert.match(dialog, /automatic suggestions are not a guarantee/);

  assert.match(pathway, /name: "Pasted IEP text", text: pasted/);
  assert.doesNotMatch(pathway, /onClick=\{\(\) => handleText\(pasted\)\}/);
  assert.match(pathway, /onConfirm=\{\(\{ text \}\) =>/);

  assert.match(family, /setPrivacySource\(\{ kind: "file", file: f \}\)/);
  assert.match(family, /onConfirm=\{\(\{ file \}\) =>/);
  assert.doesNotMatch(family, /\.docx|application\/msword/);

  assert.match(channel, /setPrivacySource\(\{ kind: "file", file: f \}\)/);
  assert.match(channel, /onConfirm=\{\(\{ file \}\) =>/);
  assert.match(channel, /setPendingFile\(file\)/);
});

test("the local preparation layer fails closed for unsupported and image-only formats", () => {
  const preparation = read("src/lib/sensitive-file-review.browser.ts");

  assert.match(preparation, /Scanned or image-only PDFs are blocked/);
  assert.match(preparation, /accepts only text-based PDFs and plain-text files/);
  assert.doesNotMatch(preparation, /console\.(?:log|info|warn|error)/);
});

test("server entry points repeat the privacy boundary before trusted work", () => {
  const documents = read("src/lib/documents.functions.ts");
  const channel = read("src/lib/channel-messages.functions.ts");
  const iep = read("src/lib/iep-extract.functions.ts");

  const documentGate = documents.indexOf("assertPrivacySafeDerivedUpload(data.storage_path");
  const documentData = documents.indexOf("const { supabase, userId } = context", documentGate);
  assert.ok(documentGate >= 0 && documentData > documentGate);

  const channelGate = channel.indexOf("assertPrivacySafeDerivedUpload(data.file_name");
  const channelData = channel.indexOf("const { supabase, userId } = context", channelGate);
  assert.ok(channelGate >= 0 && channelData > channelGate);

  assert.match(iep, /const privacySafeText = redactSensitiveText\(data\.text\)\.text/);
  assert.match(iep, /\$\{privacySafeText\.slice\(0, 100_000\)\}/);
  assert.doesNotMatch(iep, /\$\{data\.text\.slice\(0, 100_000\)\}/);
});
