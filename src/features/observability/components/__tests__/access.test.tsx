import { useAuthStore } from "@/features/auth/auth-store";
import { getMyPermissions } from "@/features/rbac/api";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObservabilityRoute, useObservabilityAccess } from "../access";

vi.mock("@/features/rbac/api",()=>({getMyPermissions:vi.fn()}));
vi.mock("@/features/auth/auth-store",()=>({useAuthStore:vi.fn()}));
vi.mock("@/features/auth/components/access-denied",()=>({AccessDenied:({description}:{description?:string})=><div>Access denied: {description}</div>}));
let session:{user:{id:number}|null;isAuthenticated:boolean;isBootstrapped:boolean;isLoading:boolean};
const load=vi.mocked(getMyPermissions);
function Child(){const a=useObservabilityAccess();return <div data-testid="access">{JSON.stringify(a)}</div>;}
function Gate({children}: {children:ReactNode}){return <ObservabilityRoute>{children}</ObservabilityRoute>;}
beforeEach(()=>{
  session={user:{id:1},isAuthenticated:true,isBootstrapped:true,isLoading:false};
  vi.mocked(useAuthStore).mockImplementation((pick) => pick(session as never));
  load.mockReset();load.mockResolvedValue({user_id:1,permissions:["view_observability"],email:"x",permissions_count:1});
});

describe("Observability RBAC route",()=>{
  it("blocks anonymous accounts before fetching permissions",()=>{
    session={...session,user:null,isAuthenticated:false};
    render(<Gate><Child/></Gate>);
    expect(screen.getByText(/Access denied: Sign in/)).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
  it("waits for authentication bootstrap",()=>{
    session={...session,isBootstrapped:false};
    render(<Gate><Child/></Gate>);
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
    expect(load).not.toHaveBeenCalled();
  });
  it("allows viewer only safe, read-only overview access",async()=>{
    render(<Gate><Child/></Gate>);
    const output=await screen.findByTestId("access");
    expect(output).toHaveTextContent('"view":true');
    expect(output).toHaveTextContent('"viewLogs":false');
    expect(output).toHaveTextContent('"viewAudit":false');
    expect(output).toHaveTextContent('"manageAlerts":false');
  });
  it("maps operator and admin permissions independently",async()=>{
    load.mockResolvedValue({user_id:1,email:"x",permissions_count:4,permissions:[
      "view_observability","view_observability_logs","manage_observability_alerts","create_observability_incidents",
    ]});
    render(<Gate><Child/></Gate>);
    const output=await screen.findByTestId("access");
    expect(output).toHaveTextContent('"viewLogs":true');
    expect(output).toHaveTextContent('"manageAlerts":true');
    expect(output).toHaveTextContent('"createIncidents":true');
    expect(output).toHaveTextContent('"viewAudit":false');
  });
  it("denies accounts missing view_observability",async()=>{
    load.mockResolvedValue({user_id:1,email:"x",permissions_count:1,permissions:["manage_observability_alerts"]});
    render(<Gate><Child/></Gate>);
    expect(await screen.findByText(/does not have view_observability permission/)).toBeInTheDocument();
  });
  it("rejects permission response for another user",async()=>{
    load.mockResolvedValue({user_id:22,email:"x",permissions_count:1,permissions:["view_observability"]});
    render(<Gate><Child/></Gate>);
    expect(await screen.findByText(/does not have view_observability permission/)).toBeInTheDocument();
  });
  it("retries after permission-service failure",async()=>{
    load.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({user_id:1,email:"x",permissions_count:1,permissions:["view_observability"]});
    render(<Gate><Child/></Gate>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot verify");
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    expect(await screen.findByTestId("access")).toHaveTextContent('"view":true');
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not reuse old authorization after switching accounts",async()=>{
    const pending: {resolve?: (value: never)=>void}={};
    load.mockResolvedValueOnce({user_id:1,email:"x",permissions_count:1,permissions:["view_observability"]})
      .mockImplementationOnce(()=>new Promise(r=>{pending.resolve=r;}));
    const {rerender}=render(<Gate><Child/></Gate>);
    expect(await screen.findByTestId("access")).toHaveTextContent('"view":true');
    session={...session,user:{id:2}};
    rerender(<Gate><Child/></Gate>);
    expect(screen.queryByTestId("access")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading Observability permissions");
    pending.resolve?.({user_id:2,email:"x",permissions_count:0,permissions:[]} as never);
    await waitFor(()=>expect(screen.getByText(/does not have view_observability permission/)).toBeInTheDocument());
  });
});
