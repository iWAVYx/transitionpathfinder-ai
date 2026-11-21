import {createFileRoute} from "@tanstack/react-router";
import {z} from "zod";
import {SiteShell} from "@/components/site/SiteShell";
import {RoleGuard} from "@/components/RoleGuard";
import {Breadcrumbs} from "@/components/site/Breadcrumbs";
import {StudentVoiceWorkspace} from "@/components/students/StudentVoiceWorkspace";
export const Route=createFileRoute("/_authenticated/bridgeforward/voice")({
 head:()=>({meta:[{title:"Student Voice (Grades 6–8) — TransitionForward"}]}),
 validateSearch:(search:Record<string,unknown>):{student?:string}=>({student:z.string().uuid().optional().catch(undefined).parse(search.student)}),
 component:VoicePage,
});
function VoicePage(){const search=Route.useSearch();return <RoleGuard path="/bridgeforward"><SiteShell><div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
 <Breadcrumbs trail={[{label:"BridgeForward",to:"/bridgeforward"},{label:"Student Voice"}]}/>
 <div className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">In Their Own Words</p><h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">Student Voice (Grades 6–8)</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Capture what the student wants their team to know. Skip what doesn't fit, and return anytime to update.</p></div>
 <StudentVoiceWorkspace middleSchool={true} initialStudentId={search.student}/>
 </div></SiteShell></RoleGuard>;}
