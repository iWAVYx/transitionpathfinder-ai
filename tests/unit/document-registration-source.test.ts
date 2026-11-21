import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { prepareDocumentRegistrationCopy } from "../../src/lib/document-registration-source.server";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const text="Fictional reviewed source",copy=new Blob([text]);
const source={objectId:id(1),objectVersion:"v1",storagePath:`${id(2)}/${id(3)}-privacy-safe-document.txt`,contentSha256:createHash("sha256").update(text).digest("hex")};
const info={id:id(1),version:"v1",name:source.storagePath,bucketId:"student-documents",size:copy.size,contentType:"text/plain"};
const rpc=vi.fn(),object=vi.fn(),download=vi.fn();
const client={rpc,storage:{from:()=>({info:object,download})}};
const prepare=()=>prepareDocumentRegistrationCopy(client,id(4),id(2),copy.size,source);
beforeEach(()=>{
 vi.resetAllMocks();rpc.mockImplementation(async(name:string)=>({data:name==="can_edit_student",error:null}));
 object.mockResolvedValue({data:info,error:null});download.mockResolvedValue({data:copy,error:null});
});
it("holds one immutable caller-readable copy and rechecks authority/object identity around its download",async()=>{
 const result=await prepare();expect(result.copy).toBe(copy);expect(result.contentHash).toBe(source.contentSha256);
 expect(download).toHaveBeenCalledExactlyOnceWith(source.storagePath);expect(object).toHaveBeenCalledTimes(2);await result.confirm();expect(object).toHaveBeenCalledTimes(3);expect(download).toHaveBeenCalledTimes(1);
});
it.each([false,null,"true",1])("refuses uncertain current edit access %s before object IO",async data=>{
 rpc.mockResolvedValue({data,error:null});await expect(prepare()).rejects.toThrow("couldn't confirm the uploaded copy");expect(object).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();
});
it.each([true,null,"false"])("refuses uncertain non-partner status %s",async data=>{
 rpc.mockImplementation(async(name:string)=>({data:name==="can_edit_student"?true:data,error:null}));await expect(prepare()).rejects.toThrow("couldn't confirm the uploaded copy");expect(object).not.toHaveBeenCalled();
});
it.each(["id","version","name","bucketId","size","contentType","archivedAt","isDeleteMarker","error","missing"])("rejects unsafe managed object metadata %s",async field=>{
 object.mockResolvedValue({data:field==="missing"?null:{...info,...(field==="error"?{}:{[field]:field==="size"?1:field==="isDeleteMarker"?true:"foreign"})},error:field==="error"?{message:"PRIVATE"}:null});
 await expect(prepare()).rejects.toThrow("couldn't confirm the uploaded copy");expect(download).not.toHaveBeenCalled();
});
it.each(["lost","error","not-blob","size","hash"])("rejects uncertain stored bytes %s without replay",async mode=>{
 if(mode==="lost")download.mockRejectedValue(Error("PRIVATE"));
 else download.mockResolvedValue({data:mode==="not-blob"?text:mode==="size"?new Blob(["short"]):mode==="hash"?new Blob(["X"+text.slice(1)]):copy,error:mode==="error"?{message:"PRIVATE"}:null});
 const error=await prepare().catch(e=>e);expect(String(error)).not.toContain("PRIVATE");expect(download).toHaveBeenCalledTimes(1);
});
it("refuses a changed object after download without reading a replacement",async()=>{
 object.mockResolvedValueOnce({data:info,error:null}).mockResolvedValueOnce({data:{...info,version:"changed"},error:null});await expect(prepare()).rejects.toThrow("couldn't confirm the uploaded copy");expect(download).toHaveBeenCalledTimes(1);
});
it("rechecks revoked authority before applying scan results",async()=>{
 const result=await prepare();rpc.mockResolvedValue({data:false,error:null});await expect(result.confirm()).rejects.toThrow("couldn't confirm the uploaded copy");expect(download).toHaveBeenCalledTimes(1);
});
it.each([undefined,0,1.5,Number.MAX_SAFE_INTEGER])("refuses unsupported declared size %s before IO",async size=>{
 await expect(prepareDocumentRegistrationCopy(client,id(4),id(2),size,source)).rejects.toThrow("couldn't confirm the uploaded copy");expect(rpc).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();
});
