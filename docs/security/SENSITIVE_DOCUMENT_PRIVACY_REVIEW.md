# Sensitive document privacy review

Status: draft implementation; not deployed or enabled in production.

## Purpose

IEPs, evaluations, progress reports, and family attachments can contain direct and indirect
identifiers. TransitionForward adds a browser-side privacy review before document text may be
analyzed or a file may enter protected storage.

This is a defense-in-depth privacy control. It is not a certification that a document has been
fully de-identified and it does not replace access control, audit logging, malware scanning,
retention rules, or legal review.

## Security boundary

1. A supported source file is read in the user's browser.
2. Common identifiers and known student-profile values are replaced in extracted text.
3. The user receives an editable preview and must confirm that they reviewed it.
4. TransitionForward creates a new generically named plain-text file.
5. Only that derived file may proceed to IEP analysis, document upload, or a channel attachment.
6. The original source file, its filename, metadata, hidden layers, scripts, and embedded content
   do not enter the derived file.
7. Protected document and channel server endpoints reject files that are not the expected generic
   plain-text artifact, and IEP analysis repeats the deterministic redaction before calling AI.

The initial supported formats are text-based PDF and plain text. Word files, images, and PDFs with
too little extractable text fail closed. They must not be saved through this workflow until a
reviewed OCR/redaction design exists.

## Suggested redactions

The deterministic browser-side pass detects common email addresses, phone numbers, Social Security
number formatting, labeled student and benefit identifiers, labeled address lines, labeled birth
dates, and known student last name, school, and birth date values. It intentionally preserves
unlabeled educational dates because service, evaluation, and meeting dates may be material.

The redaction report contains categories and counts only. It must never contain, log, or transmit
the matched values.

User-entered document titles, notes, and message bodies are outside the file-content detector. The
interface directs users to choose generic titles; a later metadata-specific privacy review should
be evaluated separately so important educational context is not silently removed.

## Why the output is text-only

Drawing an opaque box on a PDF is not reliable redaction: underlying text, metadata, embedded
content, or hidden layers can survive. Adobe treats applying redactions and sanitizing hidden
information as separate necessary operations. A new text-only artifact provides a smaller,
testable boundary for this first release and avoids claiming that the original binary was safely
rewritten.

## Authoritative references

- Adobe Acrobat, [Redact sensitive content in Acrobat Pro](https://helpx.adobe.com/acrobat/desktop/protect-documents/redact-pdfs/redacting-sanitizing.html)
- Adobe Document Cloud, [Redact and sanitize PDFs](https://experienceleague.adobe.com/en/docs/document-cloud-learn/acrobat-learning/advanced-tasks/protect/redact)
- U.S. Department of Education, [Personally Identifiable Information for Education Records](https://studentprivacy.ed.gov/content/personally-identifiable-information-education-records)
- U.S. Department of Education, [What constitutes de-identified records and information?](https://studentprivacy.ed.gov/faq/what-constitutes-de-identified-records-and-information)
- NIST SP 800-122, [Guide to Protecting the Confidentiality of Personally Identifiable Information](https://csrc.nist.gov/pubs/sp/800/122/final)

## Before enabling protected uploads

- Complete code and product review of the privacy preview.
- Verify keyboard and screen-reader operation.
- Verify raw source text never reaches an application server or telemetry.
- Verify only the derived generic `.txt` file reaches storage and antivirus quarantine.
- Verify the original filename cannot become an implicit document title.
- Run clean-file and harmless EICAR staging evidence after the underlying upload safety gate is
  separately approved.
- Define retention/deletion behavior and user-facing privacy language with counsel.
