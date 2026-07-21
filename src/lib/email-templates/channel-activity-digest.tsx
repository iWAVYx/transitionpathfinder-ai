import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface ChannelRow {
  channel_title: string;
  unread_count: number;
  mentions: number;
  open_actions: number;
  latest_preview?: string;
  channel_url: string;
}

interface Props {
  recipientName?: string;
  siteName?: string;
  totalUnread?: number;
  totalMentions?: number;
  totalOpenActions?: number;
  channels?: ChannelRow[];
  hubUrl?: string;
  cadence?: "daily" | "weekly";
}

const Email = ({
  recipientName = "there",
  siteName = "TransitionForward",
  totalUnread = 0,
  totalMentions = 0,
  totalOpenActions = 0,
  channels = [],
  hubUrl = "https://transitionforwardct.com/transition-channel",
  cadence = "daily",
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {totalMentions > 0
        ? `${totalMentions} mention${totalMentions === 1 ? "" : "s"} and ${totalUnread} unread in your Transition Channel`
        : `${totalUnread} new update${totalUnread === 1 ? "" : "s"} in your Transition Channel`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your Transition Channel {cadence === "weekly" ? "Weekly" : "Daily"} Digest</Heading>
        <Text style={intro}>
          Hi {recipientName}, here is what's waiting for you in {siteName}.
        </Text>

        <Section style={statsRow}>
          <Text style={stat}>
            <strong style={statNum}>{totalUnread}</strong>
            <span style={statLabel}> unread messages</span>
          </Text>
          <Text style={stat}>
            <strong style={statNum}>{totalMentions}</strong>
            <span style={statLabel}> mentions</span>
          </Text>
          <Text style={stat}>
            <strong style={statNum}>{totalOpenActions}</strong>
            <span style={statLabel}> open actions</span>
          </Text>
        </Section>

        {channels.length === 0 ? (
          <Text style={muted}>
            No new channel activity since your last digest. We'll email again if that changes.
          </Text>
        ) : (
          channels.map((c, idx) => (
            <Section key={idx} style={channelCard}>
              <Text style={channelTitle}>{c.channel_title}</Text>
              <Text style={channelMeta}>
                {c.unread_count} unread
                {c.mentions > 0 ? ` · ${c.mentions} mention${c.mentions === 1 ? "" : "s"}` : ""}
                {c.open_actions > 0 ? ` · ${c.open_actions} open action${c.open_actions === 1 ? "" : "s"}` : ""}
              </Text>
              {c.latest_preview && <Text style={preview}>"{c.latest_preview}"</Text>}
              <Link href={c.channel_url} style={cta}>
                Open channel →
              </Link>
            </Section>
          ))
        )}

        <Text style={footer}>
          <Link href={hubUrl} style={footerLink}>
            Open your Transition Channel
          </Link>
          {" · "}
          Change digest frequency in Settings → Notifications.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const m = Number(data.totalMentions ?? 0);
    const u = Number(data.totalUnread ?? 0);
    if (m > 0) return `${m} mention${m === 1 ? "" : "s"} in your Transition Channel`;
    return `Transition Channel digest — ${u} update${u === 1 ? "" : "s"}`;
  },
  displayName: "Transition Channel Digest",
  previewData: {
    recipientName: "Alex",
    totalUnread: 8,
    totalMentions: 2,
    totalOpenActions: 3,
    channels: [
      {
        channel_title: "Jordan Rivera · Family Team",
        unread_count: 5,
        mentions: 2,
        open_actions: 1,
        latest_preview: "Reminder — IEP meeting is Thursday at 3pm.",
        channel_url: "https://transitionforwardct.com/transition-channel",
      },
    ],
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const h1 = { fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: "0 0 8px" };
const intro = { fontSize: "15px", color: "#334155", margin: "0 0 20px" };
const statsRow = { display: "block", padding: "12px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", margin: "0 0 24px" };
const stat = { display: "inline-block", marginRight: "24px", fontSize: "14px", color: "#475569" };
const statNum = { fontSize: "20px", color: "#0f172a" };
const statLabel = { color: "#64748b" };
const channelCard = { padding: "14px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "12px" };
const channelTitle = { fontSize: "15px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px" };
const channelMeta = { fontSize: "13px", color: "#64748b", margin: "0 0 8px" };
const preview = { fontSize: "13px", color: "#334155", fontStyle: "italic", margin: "0 0 8px" };
const cta = { fontSize: "13px", color: "#2563eb", textDecoration: "none" };
const muted = { fontSize: "14px", color: "#64748b", padding: "16px 0" };
const footer = { fontSize: "12px", color: "#94a3b8", marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" };
const footerLink = { color: "#2563eb", textDecoration: "none" };
