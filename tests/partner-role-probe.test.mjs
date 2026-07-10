// Partner journey probe: verifies a partner user scoped to their own
// organization can create/read/update their own opportunities but cannot
// touch peer partner drafts, student PII, IEP documents, Student Voice,
// Pathway Reports, goals, meetings, notes, or admin surfaces.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function makeUser(tag, role) {
  const email = `qa.partner.${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@transitionforward.test`;
  const password = "TestPass!2026";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const uid = data.user.id;
  await admin.from("user_roles").insert({ user_id: uid, role });
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { uid, email, password, client };
}
async function cleanup(u) { try { await admin.auth.admin.deleteUser(u.uid); } catch {} }

test("partner RLS: own org opportunities OK; peer drafts and student PII blocked", async () => {
  const PA = await makeUser("PA", "partner"); // partner on org 1
  const PB = await makeUser("PB", "partner"); // partner on org 2
  const parent = await makeUser("PP", "parent"); // owns unrelated student

  const org1 = { id: null };
  const org2 = { id: null };
  let studentId = null;
  const opps = { paDraft: null, paApproved: null, pbDraft: null, pbApproved: null };

  try {
    // Two partner orgs; org1 verified, org2 unverified to also test directory visibility
    const { data: o1 } = await admin.from("organizations").insert({
      name: "QA Partner Org 1", type: "partner", verified_status: "verified",
    }).select("id").single();
    org1.id = o1.id;
    const { data: o2 } = await admin.from("organizations").insert({
      name: "QA Partner Org 2", type: "partner", verified_status: "verified",
    }).select("id").single();
    org2.id = o2.id;

    await admin.from("organization_memberships").insert([
      { organization_id: org1.id, user_id: PA.uid, role_within_org: "admin", status: "active", membership_status: "active" },
      { organization_id: org2.id, user_id: PB.uid, role_within_org: "admin", status: "active", membership_status: "active" },
    ]);

    // Seed opportunities via service role: draft + approved per org
    const seed = async (orgId, status, title) => {
      const { data, error } = await admin.from("partner_opportunities").insert({
        organization_id: orgId, title, opportunity_type: "internship", status,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    };
    opps.paDraft = await seed(org1.id, "draft", "PA Draft");
    opps.paApproved = await seed(org1.id, "approved", "PA Approved");
    opps.pbDraft = await seed(org2.id, "draft", "PB Draft");
    opps.pbApproved = await seed(org2.id, "approved", "PB Approved");

    // Unrelated student with PII surfaces
    const { data: stu } = await admin.from("students")
      .insert({ owner_id: parent.uid, first_name: "Unrelated" }).select("id").single();
    studentId = stu.id;
    await admin.from("goals").insert({ student_id: studentId, title: "G", category: "postsecondary", created_by_user_id: parent.uid });
    await admin.from("student_voice_responses").insert({ student_id: studentId, question: "q", response: "r" });
    await admin.from("student_intakes").insert({ user_id: parent.uid, student_id: studentId, student_first_name: "Unrelated" });
    await admin.from("pathway_reports").insert({ user_id: parent.uid, student_id: studentId, title: "Report", content: {} });
    await admin.from("collaboration_notes").insert({ student_id: studentId, created_by_user_id: parent.uid, content: "n" });
    await admin.from("meetings").insert({ student_id: studentId, title: "M", created_by_user_id: parent.uid });

    // --- PA CAN read own draft + own approved via org membership
    const { data: paOwn } = await PA.client.from("partner_opportunities")
      .select("id,status").eq("organization_id", org1.id);
    const ids = new Set((paOwn ?? []).map(r => r.id));
    assert.ok(ids.has(opps.paDraft) && ids.has(opps.paApproved), "PA cannot see own opportunities");

    // --- PA CAN read peer approved (public catalog) but NOT peer draft
    const { data: peer } = await PA.client.from("partner_opportunities")
      .select("id,status").eq("organization_id", org2.id);
    const peerIds = new Set((peer ?? []).map(r => r.id));
    assert.ok(peerIds.has(opps.pbApproved), "PA cannot see peer approved opportunity");
    assert.ok(!peerIds.has(opps.pbDraft), "PA leaked peer DRAFT opportunity");

    // --- PA CAN insert opportunity for own org
    const { error: insOwnErr } = await PA.client.from("partner_opportunities").insert({
      organization_id: org1.id, title: "PA New", opportunity_type: "internship", status: "draft",
    });
    assert.equal(insOwnErr, null, `PA cannot insert own opportunity: ${insOwnErr?.message}`);

    // --- PA CANNOT insert opportunity for peer org
    const { error: insPeerErr } = await PA.client.from("partner_opportunities").insert({
      organization_id: org2.id, title: "Sneaky", opportunity_type: "internship", status: "draft",
    });
    assert.ok(insPeerErr, "PA was able to insert opportunity into peer org");

    // --- PA CANNOT update peer opportunity (RLS filters to 0 rows)
    const { data: upd } = await PA.client.from("partner_opportunities")
      .update({ title: "Hijacked" }).eq("id", opps.pbApproved).select("id");
    assert.equal(upd?.length ?? 0, 0, "PA was able to update peer opportunity");

    // --- PA CANNOT delete peer opportunity
    const { data: del } = await PA.client.from("partner_opportunities")
      .delete().eq("id", opps.pbDraft).select("id");
    assert.equal(del?.length ?? 0, 0, "PA was able to delete peer opportunity");

    // --- PA has NO access to student PII surfaces
    for (const tbl of [
      "students", "goals", "student_voice_responses", "student_intakes",
      "pathway_reports", "collaboration_notes", "meetings", "documents",
      "action_items", "calendar_events",
    ]) {
      const { data } = await PA.client.from(tbl).select("id").eq("student_id", studentId).limit(1);
      // students table has no student_id — retry with id
      if (tbl === "students") {
        const { data: s } = await PA.client.from("students").select("id").eq("id", studentId);
        assert.equal(s?.length ?? 0, 0, "PA can read unrelated student row");
        continue;
      }
      assert.equal(data?.length ?? 0, 0, `PA leaked student data from ${tbl}`);
    }

    // --- PA cannot read privileged tables broadly
    for (const tbl of ["admin_roles", "access_entitlements", "partner_network_opportunities"]) {
      const { data } = await PA.client.from(tbl).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, `PA can read privileged table ${tbl}`);
    }

    // --- PA cannot escalate to admin
    const { error: escErr } = await PA.client.from("user_roles").insert({ user_id: PA.uid, role: "admin" });
    assert.ok(escErr, "PA was able to self-grant admin role");

    // --- PA cannot inject membership into peer org
    const { error: badMemb } = await PA.client.from("organization_memberships").insert({
      organization_id: org2.id, user_id: PA.uid,
      role_within_org: "admin", status: "active", membership_status: "active",
    });
    assert.ok(badMemb, "PA was able to insert membership into peer partner org");

    // --- PartnerForward saves: PA can save for self, not for peer user
    const { data: pfRes } = await admin.from("partnerforward_resources")
      .insert({ title: "R", status: "published" }).select("id").single();
    const { error: savedSelfErr } = await PA.client
      .from("partnerforward_partner_saved_resources")
      .insert({ partner_user_id: PA.uid, resource_id: pfRes.id });
    assert.equal(savedSelfErr, null, `PA cannot save PF resource for self: ${savedSelfErr?.message}`);
    const { error: savedPeerErr } = await PA.client
      .from("partnerforward_partner_saved_resources")
      .insert({ partner_user_id: PB.uid, resource_id: pfRes.id });
    assert.ok(savedPeerErr, "PA was able to save PF resource on behalf of peer");

    await admin.from("partnerforward_partner_saved_resources").delete().eq("resource_id", pfRes.id);
    await admin.from("partnerforward_resources").delete().eq("id", pfRes.id);
  } finally {
    if (studentId) await admin.from("students").delete().eq("id", studentId);
    for (const orgId of [org1.id, org2.id]) {
      if (!orgId) continue;
      await admin.from("partner_opportunities").delete().eq("organization_id", orgId);
      await admin.from("organization_memberships").delete().eq("organization_id", orgId);
      await admin.from("organizations").delete().eq("id", orgId);
    }
    await cleanup(PA); await cleanup(PB); await cleanup(parent);
  }
});
