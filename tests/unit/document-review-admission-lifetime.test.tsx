// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({user:{id:'00000000-0000-4000-8000-000000000001'} as {id:string}|null,authLoading:false,documentId:'00000000-0000-4000-8000-000000000004',get:vi.fn(),run:vi.fn(),section:vi.fn(),meta:vi.fn(),apply:vi.fn(),log:vi.fn(),navigate:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/hooks/use-auth',()=>({useAuth:()=>({user:api.user,loading:api.authLoading})}));
vi.mock('@tanstack/react-router',()=>({createFileRoute:()=> (options:any)=>({options,useParams:()=>({documentId:api.documentId})}),useNavigate:()=>api.navigate,Link:({children,...props}:any)=><a {...props}>{children}</a>}));
vi.mock('@tanstack/react-start',()=>({useServerFn:(fn:any)=>fn}));
vi.mock('@/components/withRoleGuard',()=>({withRoleGuard:(_roles:any,component:any)=>component}));
vi.mock('sonner',()=>({toast:{success:api.success,error:api.error}}));
vi.mock('@/components/site/SiteShell',()=>({SiteShell:({children}:any)=><div>{children}</div>}));
vi.mock('@/components/navigation/NavigationOriginProvider',()=>({ContextualBackLink:({label,children}:any)=><a>{label??children}</a>}));
vi.mock('@/components/site/Breadcrumbs',()=>({Breadcrumbs:()=>null}));
vi.mock('@/components/site/TrustNote',()=>({TrustNote:()=>null}));
vi.mock('@/components/site/AIDisclaimer',()=>({AIDisclaimer:()=>null}));
vi.mock('@/components/documents/DocumentClassificationCard',()=>({DocumentClassificationCard:()=>null}));
vi.mock('@/components/pathway/ExtractEvidenceButton',()=>({ExtractEvidenceButton:()=>null}));
vi.mock('@/lib/documents.functions',()=>({logDocumentView:api.log}));
vi.mock('@/lib/extractions.functions',()=>({EXTRACTION_SECTION_KEYS:['strengths'],getOrCreateExtraction:api.get,runExtractionFromText:api.run,updateExtractionSection:api.section,updateExtractionMeta:api.meta,applyAcceptedExtraction:api.apply}));
import {Route} from '../../src/routes/_authenticated/documents.$documentId.review';
const Page=(Route as any).options.component;
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const record=(text='PRIVATE first account',doc=id(4))=>({id:id(2),student_id:id(3),document_id:doc,status:'in_review',updated_at:'2026-10-29T12:00:00.123456+00:00',sections:{strengths:{state:'accepted',value:text,original_value:text,notes:''}},missing_information:[],suggested_questions:[],review_notes:null});
beforeEach(()=>{vi.clearAllMocks();api.user={id:id(1)};api.authLoading=false;api.documentId=id(4);api.get.mockResolvedValue({extraction:record()});api.apply.mockResolvedValue({ok:true});api.log.mockResolvedValue({ok:true});});
afterEach(cleanup);
it('sends the loaded viewer identity with the existing source/revision when applying',async()=>{render(<Page/>);await screen.findByText('PRIVATE first account');fireEvent.click(screen.getAllByRole('button',{name:/save to student profile/i})[0]);await waitFor(()=>expect(api.apply).toHaveBeenCalledTimes(1));expect(api.apply).toHaveBeenCalledWith({data:{expected_viewer_id:id(1),extraction_id:id(2),student_id:id(3),document_id:id(4),expected_updated_at:record().updated_at,expected_sections:record().sections}});});
it('hides prior account data while loading the next account review',async()=>{const view=render(<Page/>);await screen.findByText('PRIVATE first account');api.get.mockReturnValueOnce(new Promise(()=>{}));api.user={id:id(9)};view.rerender(<Page/>);expect(screen.queryByText('PRIVATE first account')).toBeNull();expect(screen.getByRole('status').textContent).toContain('Loading your document review');expect(screen.queryByRole('button',{name:/save to student profile/i})).toBeNull();});
it('ignores an old Apply completion after changing accounts',async()=>{let finish!:()=>void;api.apply.mockReturnValueOnce(new Promise(resolve=>{finish=()=>resolve({ok:true});}));const view=render(<Page/>);await screen.findByText('PRIVATE first account');fireEvent.click(screen.getAllByRole('button',{name:/save to student profile/i})[0]);await waitFor(()=>expect(api.apply).toHaveBeenCalledTimes(1));api.get.mockResolvedValueOnce({extraction:record('Current second account')});api.user={id:id(9)};view.rerender(<Page/>);await screen.findByText('Current second account');await act(async()=>{finish();});expect(api.success).not.toHaveBeenCalled();expect(api.navigate).not.toHaveBeenCalled();expect(screen.queryByText('PRIVATE first account')).toBeNull();});
it('ignores a departed document load even after returning to the original document',async()=>{let finishOld!:(x:any)=>void;api.get.mockReturnValueOnce(new Promise(resolve=>{finishOld=resolve;}));const view=render(<Page/>);api.documentId=id(8);api.get.mockResolvedValueOnce({extraction:record('Intermediate document',id(8))});view.rerender(<Page/>);await screen.findByText('Intermediate document');api.documentId=id(4);api.get.mockResolvedValueOnce({extraction:record('Fresh original document')});view.rerender(<Page/>);await screen.findByText('Fresh original document');await act(async()=>{finishOld({extraction:record('PRIVATE stale original')});});expect(screen.queryByText('PRIVATE stale original')).toBeNull();expect(screen.getByText('Fresh original document')).toBeTruthy();});
it('sends the loaded viewer, student and exact review revision for text extraction',async()=>{
 api.run.mockResolvedValueOnce({extraction:record('Generated current draft')});render(<Page/>);await screen.findByText('PRIVATE first account');
 const text='Fictional IEP transition pages with recorded strengths and supports.';
 fireEvent.change(screen.getByPlaceholderText('Paste IEP text here…'),{target:{value:text}});
 fireEvent.click(screen.getByRole('button',{name:'Re-run extraction'}));
 await waitFor(()=>expect(api.run).toHaveBeenCalledTimes(1));
 expect(api.run).toHaveBeenCalledWith({data:{expected_viewer_id:id(1),document_id:id(4),student_id:id(3),extraction_id:id(2),expected_updated_at:record().updated_at,text}});
 await screen.findByText('Generated current draft');
});
it('ignores generated text from a departed account and disables a second generation while waiting',async()=>{
 let finish!:(x:any)=>void;api.run.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const view=render(<Page/>);await screen.findByText('PRIVATE first account');
 fireEvent.change(screen.getByPlaceholderText('Paste IEP text here…'),{target:{value:'Fictional IEP transition pages with recorded strengths and supports.'}});
 fireEvent.click(screen.getByRole('button',{name:'Re-run extraction'}));await waitFor(()=>expect(api.run).toHaveBeenCalledTimes(1));
 expect((screen.getByRole('button',{name:'Re-run extraction'}) as HTMLButtonElement).disabled).toBe(true);
 api.get.mockResolvedValueOnce({extraction:record('Current second account')});api.user={id:id(9)};view.rerender(<Page/>);await screen.findByText('Current second account');
 await act(async()=>{finish({extraction:record('PRIVATE stale generated draft')});});
 expect(screen.queryByText('PRIVATE stale generated draft')).toBeNull();expect(api.success).not.toHaveBeenCalled();
});
it('orders rapid manual edits with exact confirmed revisions and keeps Apply blocked while saving',async()=>{
 let finish!:(x:any)=>void;api.section.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({updated_at:'2026-11-12T12:00:00.000002+00:00'});
 render(<Page/>);await screen.findByText('PRIVATE first account');fireEvent.click(screen.getByRole('button',{name:'Edit'}));
 await waitFor(()=>expect(api.section).toHaveBeenCalledTimes(1));
 const strengthInput=screen.getByDisplayValue('PRIVATE first account') as HTMLTextAreaElement;fireEvent.change(strengthInput,{target:{value:''}});
 expect(api.section).toHaveBeenCalledTimes(1);
 expect((screen.getAllByRole('button',{name:/save to student profile/i})[0] as HTMLButtonElement).disabled).toBe(true);
 await act(async()=>{finish({updated_at:'2026-11-12T12:00:00.000001+00:00'});});
 await waitFor(()=>expect(api.section).toHaveBeenCalledTimes(2));
 expect(api.section.mock.calls[0][0].data).toEqual({expected_viewer_id:id(1),document_id:id(4),student_id:id(3),extraction_id:id(2),expected_updated_at:record().updated_at,key:'strengths',state:'edited'});
 expect(api.section.mock.calls[1][0].data).toMatchObject({expected_updated_at:'2026-11-12T12:00:00.000001+00:00',value:'',state:'edited'});
 expect(api.section.mock.calls[1][0].data).not.toHaveProperty('notes');
 expect(strengthInput.value).toBe('');
});
it('drops queued edits and old save receipts after changing accounts',async()=>{
 let finish!:(x:any)=>void;api.section.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const view=render(<Page/>);await screen.findByText('PRIVATE first account');fireEvent.click(screen.getByRole('button',{name:'Edit'}));await waitFor(()=>expect(api.section).toHaveBeenCalledTimes(1));fireEvent.change(screen.getByDisplayValue('PRIVATE first account'),{target:{value:'Pending private edit'}});
 api.get.mockResolvedValueOnce({extraction:record('Current second account')});api.user={id:id(9)};view.rerender(<Page/>);await screen.findByText('Current second account');
 await act(async()=>{finish({updated_at:'2026-11-12T12:00:00.000001+00:00'});});
 expect(api.section).toHaveBeenCalledTimes(1);expect(api.error).not.toHaveBeenCalled();expect(screen.queryByText('Pending private edit')).toBeNull();
});
it('stops queued edits after an uncertain save and requires reload before Apply',async()=>{
 let fail!:(e:any)=>void;api.section.mockReturnValueOnce(new Promise((_resolve,reject)=>{fail=reject;}));render(<Page/>);await screen.findByText('PRIVATE first account');fireEvent.click(screen.getByRole('button',{name:'Edit'}));await waitFor(()=>expect(api.section).toHaveBeenCalledTimes(1));fireEvent.change(screen.getByDisplayValue('PRIVATE first account'),{target:{value:'Pending edit'}});
 await act(async()=>{fail(Error('Could not confirm save.'));});expect(api.section).toHaveBeenCalledTimes(1);expect(screen.getByRole('alert').textContent).toContain('Reload the review');expect((screen.getAllByRole('button',{name:/save to student profile/i})[0] as HTMLButtonElement).disabled).toBe(true);expect(api.apply).not.toHaveBeenCalled();
});
it('sends only the changed note with viewer/source identity and exact version',async()=>{
 api.meta.mockResolvedValueOnce({updated_at:'2026-11-12T12:00:00.000001+00:00'});render(<Page/>);await screen.findByText('PRIVATE first account');const notes=screen.getByPlaceholderText('Anything else the team should know about this IEP…');fireEvent.change(notes,{target:{value:'New reviewer note'}});fireEvent.blur(notes);await waitFor(()=>expect(api.meta).toHaveBeenCalledTimes(1));expect(api.meta).toHaveBeenCalledWith({data:{expected_viewer_id:id(1),extraction_id:id(2),student_id:id(3),document_id:id(4),expected_updated_at:record().updated_at,review_notes:'New reviewer note'}});
});
