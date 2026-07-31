import * as React from 'react'
import { Hr, Text } from '@react-email/components'
import { LEGAL_ATTRIBUTION, SUPPORT_EMAIL } from '@/lib/contact'

/**
 * Shared legal identity block for every outbound email.
 *
 * Hard rule: this block — and every template that renders it — must never
 * contain student records, disability information, IEP or Pathway content, or
 * any sensitive identifier. Sensitive detail lives behind authentication.
 */
export function EmailLegalFooter() {
  return (
    <>
      <Hr style={rule} />
      <Text style={legal}>
        {LEGAL_ATTRIBUTION} Questions? Reply to this message or email {SUPPORT_EMAIL}.
      </Text>
      <Text style={legal}>
        For your privacy, we never include student names, plan content, or document details
        in email. Sign in to view anything sensitive.
      </Text>
    </>
  )
}

const rule = { borderColor: '#e2e8f0', margin: '28px 0 16px' }
const legal = {
  fontSize: '11px',
  color: '#94a3b8',
  lineHeight: '1.6',
  margin: '0 0 8px',
}
