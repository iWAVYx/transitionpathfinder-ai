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
import type { TemplateEntry } from './registry'

interface Props {
  inviterName?: string
  studentName?: string
  roleLabel?: string
  acceptUrl?: string
  siteName?: string
}

const CollaboratorInvitationEmail = ({
  inviterName = 'A TransitionForward user',
  studentName = 'a student',
  roleLabel = 'Viewer',
  acceptUrl = 'https://example.com/dashboard',
  siteName = 'TransitionForward',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    {/* Preview intentionally omits student and inviter names — inbox/lock-screen previews must not leak PII. */}
    <Preview>You have a new collaboration invitation on {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been invited to collaborate</Heading>
        <Text style={text}>
          <strong>{inviterName}</strong> invited you to collaborate on{' '}
          <strong>{studentName}</strong> in {siteName} as a <strong>{roleLabel}</strong>.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={acceptUrl}>
            Open my dashboard
          </Button>
        </Section>
        <Text style={text}>
          Sign in with this email address to see the pending invite on your dashboard
          and accept it.
        </Text>
        <Text style={footer}>
          If you weren't expecting this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default CollaboratorInvitationEmail

export const template = {
  component: CollaboratorInvitationEmail,
  // Subject intentionally omits inviter and student names to avoid leaking PII in inbox lists.
  subject: (data: Record<string, any>) =>
    `You've been invited to collaborate on ${data?.siteName ?? 'TransitionForward'}`,
  displayName: 'Collaborator Invitation',
  previewData: {
    inviterName: 'Jordan Rivera',
    studentName: 'Marcus Lee',
    roleLabel: 'Viewer',
    acceptUrl: 'https://example.com/dashboard',
    siteName: 'TransitionForward',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }
const text = { fontSize: '15px', lineHeight: '1.6', color: '#334155' }
const button = {
  backgroundColor: '#0a6c4a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 600,
}
const footer = { fontSize: '13px', color: '#64748b', marginTop: '24px' }
