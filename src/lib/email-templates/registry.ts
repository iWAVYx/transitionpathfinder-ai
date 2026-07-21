import type { ComponentType } from 'react'
import { template as adminInvitationTemplate } from './admin-invitation'
import { template as collaboratorInvitationTemplate } from './collaborator-invitation'
import { template as channelActivityDigestTemplate } from './channel-activity-digest'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-invitation': adminInvitationTemplate,
  'collaborator-invitation': collaboratorInvitationTemplate,
  'channel-activity-digest': channelActivityDigestTemplate,
}
