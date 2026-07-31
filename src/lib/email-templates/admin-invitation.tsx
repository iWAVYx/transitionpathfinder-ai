import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { EmailLegalFooter } from './legal-footer'
import type { TemplateEntry } from './registry'

interface Props {
  inviterName?: string
  roleLabel?: string
  acceptUrl?: string
  expiresAt?: string
  siteName?: string
}

const AdminInvitationEmail = ({
  inviterName = 'A platform admin',
  roleLabel = 'Platform Admin',
  acceptUrl = 'https://example.com',
  expiresAt,
  siteName = 'Transition Pathways Hub',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName} as a {roleLabel}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're invited to the Admin Hub</Heading>
        <Text style={text}>
          {inviterName} has invited you to join <strong>{siteName}</strong> as a{' '}
          <strong>{roleLabel}</strong>. Click the button below to accept your invitation
          and access the Admin Hub.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={acceptUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={text}>
          If the button doesn't work, copy and paste this link into your browser:
          <br />
          <span style={{ wordBreak: 'break-all', color: '#0a6c4a' }}>{acceptUrl}</span>
        </Text>
        {expiresAt ? (
          <Text style={footer}>
            This invitation expires on {new Date(expiresAt).toLocaleDateString()}.
          </Text>
        ) : null}
        <Text style={footer}>
          You'll need to sign in with the email address this invitation was sent to.
          If you weren't expecting this, you can safely ignore this email.
        </Text>
        <EmailLegalFooter />
      </Container>
    </Body>
  </Html>
)

export default AdminInvitationEmail

export const template = {
  component: AdminInvitationEmail,
  subject: (data: Record<string, any>) =>
    `You're invited to ${data?.siteName ?? 'Transition Pathways Hub'} as a ${data?.roleLabel ?? 'Platform Admin'}`,
  displayName: 'Admin Invitation',
  previewData: {
    inviterName: 'Caysi Morgan',
    roleLabel: 'Platform Admin',
    acceptUrl: 'https://example.com/admin-invite/sample-token',
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    siteName: 'Transition Pathways Hub',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#0a6c4a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', lineHeight: '1.5' }
