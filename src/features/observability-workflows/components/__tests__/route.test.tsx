import { useAuthStore } from "@/features/auth/auth-store";
import { getMyPermissions } from "@/features/rbac/api";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowRoute, useWorkflowAccess } from "../route";
vi.mock("@/features/rbac/api",()=>({getMyPermissions:vi.fn()}));
vi.mock("@/features/auth/auth-store",()=>({useAuthStore:vi.fn()}));
vi.mock("@/features/auth/components/access-denied",()=>({AccessDenied:({description}:{description?:string})=><div>Access denied: {description}</div>}));
let session:{user:{id:number}|null;isAuthenticated:boolean;isBootstrapped:boolean;isLoading:boolean};
const load=vi.mocked(getMyPermissions);
function Child(){const access=useWorkflowAccess();return <div data-testid="rights">{JSON.stringify(access)}</div>;}
beforeEach(()=>{
  session={user:{id:11},isAuthenticated:true,isBootstrapped:true,isLoading:false};
  vi.mocked(useAuthStore).mockImplementation((pick)=>pick(session as never));
  load.mockReset();load.mockResolvedValue({user_id:11,email:"x",permissions_count:1,permissions:["view_observability_incidents"]});
});
const renderGate=()=>render(<WorkflowRoute><Child/></WorkflowRoute>);

describe("Incident/Operations role gate",()=>{
  it("denies anonymous users without API call",()=>{
    session={...session,user:null,isAuthenticated:false};renderGate();
    expect(screen.getByText(/Sign in to access Observability workflows/)).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
  it("shows safe waiting state while bootstrapping",()=>{
    session={...session,isBootstrapped:false};renderGate();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
  it("allows a viewer to read incidents only",async()=>{
    renderGate();
    const rights=await screen.findByTestId("rights");
    expect(rights).toHaveTextContent('"viewIncidents":true');
    expect(rights).toHaveTextContent('"requestAI":false');
    expect(rights).toHaveTextContent('"approveOps":false');
  });
  it("allows operations-only accounts",async()=>{
    load.mockResolvedValue({user_id:11,email:"x",permissions_count:1,permissions:["view_observability_operations"]});
    renderGate();
    expect(await screen.findByTestId("rights")).toHaveTextContent('"viewOps":true');
  });
  it("denies users with neither read permission",async()=>{
    load.mockResolvedValue({user_id:11,email:"x",permissions_count:0,permissions:[]});
    renderGate();
    expect(await screen.findByText(/Ask an admin to assign/)).toBeInTheDocument();
  });
  it("rejects cross-account permission response",async()=>{
    load.mockResolvedValue({user_id:30,email:"x",permissions_count:1,permissions:["view_observability_incidents"]});
    renderGate();
    expect(await screen.findByText(/Ask an admin to assign/)).toBeInTheDocument();
  });
  it("maps individual operator and approver permissions",async()=>{
    load.mockResolvedValue({user_id:11,email:"x",permissions_count:5,permissions:[
      "view_observability_incidents","create_observability_incidents","assign_observability_incidents",
      "request_observability_ai_diagnosis","approve_observability_operations",
    ]});
    renderGate();
    const rights=await screen.findByTestId("rights");
    expect(rights).toHaveTextContent('"assignIncidents":true');
    expect(rights).toHaveTextContent('"requestAI":true');
    expect(rights).toHaveTextContent('"approveOps":true');
    expect(rights).toHaveTextContent('"requestOps":false');
  });
  it("retries after failed lookup",async()=>{
    load.mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce({user_id:11,email:"x",permissions_count:1,permissions:["view_observability_incidents"]});
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not verify access");
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    expect(await screen.findByTestId("rights")).toHaveTextContent('"viewIncidents":true');
  });
  it("does not expose permissions from previous account",async()=>{
    let release: ((val: never)=>void)|undefined;
    load.mockResolvedValueOnce({user_id:11,email:"x",permissions_count:1,permissions:["view_observability_incidents"]})
      .mockImplementationOnce(()=>new Promise(r=>{release=r;}));
    const {rerender}=renderGate();
    expect(await screen.findByTestId("rights")).toHaveTextContent('"viewIncidents":true');
    session={...session,user:{id:12}};rerender(<WorkflowRoute><Child/></WorkflowRoute>);
    expect(screen.queryByTestId("rights")).not.toBeInTheDocument();
    release?.({user_id:12,email:"x",permissions_count:0,permissions:[]} as never);
    expect(await screen.findByText(/Ask an admin to assign/)).toBeInTheDocument();
  });
});
