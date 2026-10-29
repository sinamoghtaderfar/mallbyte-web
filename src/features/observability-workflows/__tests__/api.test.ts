import { apiClient } from "@/lib/api/client";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorText, workflowAPI } from "../api";
import { diagnosis, incident, incidentEvent, operation, page } from "../fixtures";
vi.mock("@/lib/api/client",()=>({apiClient:{get:vi.fn(),post:vi.fn()}}));
const ok=(data:unknown)=>({data} as never);
const get=vi.mocked(apiClient.get), post=vi.mocked(apiClient.post);
beforeEach(()=>{get.mockReset();post.mockReset();get.mockResolvedValue(ok(page([])));post.mockResolvedValue(ok({}));});

describe("Incident, AI and infrastructure operation API contract",()=>{
  it("lists incidents by local page", async()=>{
    get.mockResolvedValue(ok(page([incident])));
    expect(await workflowAPI.listIncidents(2)).toEqual(page([incident]));
    expect(get).toHaveBeenCalledWith("/api/observability/incidents/",{params:{page:2}});
  });
  it("submits an incident with explicit title and severity",async()=>{
    post.mockResolvedValue(ok(incident));
    expect(await workflowAPI.createIncident({title:"Synthetic",description:"No real data",severity:"high"})).toEqual(incident);
    expect(post).toHaveBeenCalledWith("/api/observability/incidents/",{title:"Synthetic",description:"No real data",severity:"high"});
  });
  it("fetches incident timeline and diagnosis history with encoded ID",async()=>{
    get.mockResolvedValueOnce(ok([incidentEvent])).mockResolvedValueOnce(ok([diagnosis]));
    expect(await workflowAPI.incidentEvents("inc /1")).toEqual([incidentEvent]);
    expect(await workflowAPI.diagnoses("inc /1")).toEqual([diagnosis]);
    expect(get).toHaveBeenNthCalledWith(1,"/api/observability/incidents/inc%20%2F1/events/");
    expect(get).toHaveBeenNthCalledWith(2,"/api/observability/incidents/inc%20%2F1/diagnoses/");
  });
  it("posts assignment, status transition and comment with correct body",async()=>{
    await workflowAPI.assign("i/1",77);
    await workflowAPI.transition("i/1","investigating","Investigating now");
    await workflowAPI.comment("i/1","Reproduced in staging");
    expect(post).toHaveBeenNthCalledWith(1,"/api/observability/incidents/i%2F1/assign/",{user_id:77});
    expect(post).toHaveBeenNthCalledWith(2,"/api/observability/incidents/i%2F1/transition/",{status:"investigating",note:"Investigating now"});
    expect(post).toHaveBeenNthCalledWith(3,"/api/observability/incidents/i%2F1/comment/",{note:"Reproduced in staging"});
  });
  it("AI diagnosis requires explicit consent, optional description and short HTTP timeout",async()=>{
    post.mockResolvedValue(ok(diagnosis));
    expect(await workflowAPI.diagnose("x?",false)).toEqual(diagnosis);
    expect(post).toHaveBeenCalledWith("/api/observability/incidents/x%3F/diagnose/",{
      include_description:false,consent_to_external_processing:true,
    },{timeout:15000});
  });
  it("lists infrastructure operations by page",async()=>{
    get.mockResolvedValue(ok(page([operation])));
    expect(await workflowAPI.listOperations(3)).toEqual(page([operation]));
    expect(get).toHaveBeenCalledWith("/api/observability/operations/",{params:{page:3}});
  });
  it("sends only target and reason for restart request",async()=>{
    post.mockResolvedValue(ok(operation));
    await workflowAPI.requestOperation("celery_worker","Verified blocked jobs");
    expect(post).toHaveBeenCalledWith("/api/observability/operations/",{
      target:"celery_worker",reason:"Verified blocked jobs",
    });
  });
  it.each(["approve","reject","cancel"] as const)("calls %s endpoint without direct restart",async action=>{
    await workflowAPI.operationAction("op/1",action);
    expect(post).toHaveBeenCalledWith(`/api/observability/operations/op%2F1/${action}/`);
  });
  it("redacts arbitrary server messages",()=>{
    const e = new AxiosError("SECRET");
    e.response = {data:{message:"secret backend details"},status:500,statusText:"Error",headers:{},config:{} as never};
    expect(errorText(e)).toBe("Request failed (HTTP 500).");
    e.response.status=403;
    expect(errorText(e)).toMatch(/permission/);
  });
});
