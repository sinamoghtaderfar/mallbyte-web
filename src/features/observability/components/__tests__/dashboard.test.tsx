import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, observabilityAPI } from "../../api";
import { adminAccess, alertFixture, errorFixture, healthFixture, metricsFixture, operatorAccess, paged, requestFixture, viewerAccess } from "../../fixtures";
import type { ObsAccess } from "../../types";
import { useObservabilityAccess } from "../access";
import { ObservabilityDashboard, dateLabel, formatCount, metricNumber } from "../dashboard";

vi.mock("../../api",()=>({
  observabilityAPI:{health:vi.fn(),metrics:vi.fn(),history:vi.fn(),alerts:vi.fn(),requests:vi.fn(),errors:vi.fn(),tasks:vi.fn(),audits:vi.fn(),alertAction:vi.fn(),resolveError:vi.fn(),createIncidentFromError:vi.fn()},
  apiError:vi.fn(),
}));
vi.mock("../access",()=>({useObservabilityAccess:vi.fn()}));
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:ReactNode})=><a href={href}>{children}</a>}));
vi.mock("recharts",()=>{
  const Stub=({children,...props}:{children?:ReactNode;[key:string]:unknown})=><div data-testid="mock-chart" data-legend={String(props.name||"")}>{children}</div>;
  return {Area:Stub,AreaChart:Stub,Bar:Stub,BarChart:Stub,CartesianGrid:Stub,Legend:Stub,ResponsiveContainer:Stub,Tooltip:Stub,XAxis:Stub,YAxis:Stub};
});
const mockAPI = {
  health:vi.mocked(observabilityAPI.health),metrics:vi.mocked(observabilityAPI.metrics),history:vi.mocked(observabilityAPI.history),
  alerts:vi.mocked(observabilityAPI.alerts),requests:vi.mocked(observabilityAPI.requests),errors:vi.mocked(observabilityAPI.errors),
  tasks:vi.mocked(observabilityAPI.tasks),audits:vi.mocked(observabilityAPI.audits),
  alertAction:vi.mocked(observabilityAPI.alertAction),resolveError:vi.mocked(observabilityAPI.resolveError),
  createIncidentFromError:vi.mocked(observabilityAPI.createIncidentFromError),
};
function asRole(access:ObsAccess){vi.mocked(useObservabilityAccess).mockReturnValue(access);}
const open = (tab: string) =>
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`^${tab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    })
  );
function init(){
  asRole(adminAccess);vi.mocked(apiError).mockImplementation(()=>"A safe error message");
  mockAPI.health.mockResolvedValue(healthFixture);
  mockAPI.metrics.mockResolvedValue(metricsFixture);
  mockAPI.history.mockResolvedValue(paged([{id:"snapshot-1",created_at:healthFixture.created_at,status:"healthy",cpu_percent:"20",memory_percent:"30",disk_percent:"40"}]));
  mockAPI.alerts.mockResolvedValue(paged([alertFixture]));
  mockAPI.requests.mockResolvedValue(paged([requestFixture]));
  mockAPI.errors.mockResolvedValue(paged([errorFixture]));
  mockAPI.tasks.mockResolvedValue(paged([{id:"task-1",task_id:"task-uuid",task_name:"sync_orders",status:"success",created_at:healthFixture.created_at}]));
  mockAPI.audits.mockResolvedValue(paged([{id:"audit-1",action:"update",object_type:"Incident",object_id:"inc-1",description:"Incident updated",actor_display:"Operator",created_at:healthFixture.created_at}]));
  mockAPI.alertAction.mockResolvedValue({} as never);
  mockAPI.resolveError.mockResolvedValue({} as never);
  mockAPI.createIncidentFromError.mockResolvedValue({} as never);
}
beforeEach(()=>{vi.resetAllMocks();init();vi.spyOn(window,"confirm").mockReturnValue(true);});

describe("Observability monitoring dashboard",()=>{
  it("renders real API metrics, services and chart sections", async()=>{
    render(<ObservabilityDashboard/>);
    expect(await screen.findByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("1.25")).toBeInTheDocument();
    expect(screen.getByText("123.5")).toBeInTheDocument();
    expect(screen.getByText("345")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.getByText("Celery Beat")).toBeInTheDocument();
    expect(screen.getByRole("img",{name:"Requests per time bucket"})).toBeInTheDocument();
    expect(mockAPI.metrics).toHaveBeenCalledWith("24h");
  });
  it("switches metrics windows without fabricating data",async()=>{
    render(<ObservabilityDashboard/>);
    await screen.findByText("1,234");
    fireEvent.click(screen.getByRole("button",{name:"7d"}));
    await waitFor(()=>expect(mockAPI.metrics).toHaveBeenCalledWith("7d"));
    expect(screen.getByRole("button",{name:"7d"})).toHaveAttribute("aria-pressed","true");
  });
  it("shows partial failure without wiping successful metrics",async()=>{
    mockAPI.health.mockRejectedValue(new Error("provider unavailable"));
    render(<ObservabilityDashboard/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("A safe error message");
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("No health snapshot is available yet.")).toBeInTheDocument();
  });
  it("detects stale snapshots visibly",async()=>{
    mockAPI.health.mockResolvedValue({...healthFixture,is_stale:true});
    render(<ObservabilityDashboard/>);
    expect(await screen.findByText("Stale snapshot")).toBeInTheDocument();
    expect(screen.getByText("Warning: latest snapshot is stale")).toBeInTheDocument();
  });
  it("viewer sees safe overview/alerts but no logs or audit tabs",async()=>{
    asRole(viewerAccess); render(<ObservabilityDashboard/>);
    expect(await screen.findByText("1,234")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name: /^Requests$/})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name: /^Errors$/})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name: /^Audit$/})).not.toBeInTheDocument();
    open("Alerts");
    expect(await screen.findByText(alertFixture.title)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Acknowledge"})).not.toBeInTheDocument();
  });
  it("acknowledges and resolves alerts after confirmation",async()=>{
    render(<ObservabilityDashboard/>);open("Alerts");
    await screen.findByText(alertFixture.title);
    fireEvent.click(screen.getByRole("button",{name:"Acknowledge"}));
    await waitFor(()=>expect(mockAPI.alertAction).toHaveBeenCalledWith("alert-1","acknowledge"));
    await waitFor(()=>expect(screen.getByRole("button",{name: /^Resolve$/})).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button",{name: /^Resolve$/}));
    await waitFor(()=>expect(mockAPI.alertAction).toHaveBeenCalledWith("alert-1","resolve"));
  });
  it("does not change alerts when confirmation is cancelled",async()=>{
    vi.spyOn(window,"confirm").mockReturnValue(false);
    render(<ObservabilityDashboard/>);open("Alerts");await screen.findByText(alertFixture.title);
    fireEvent.click(screen.getByRole("button",{name:"Acknowledge"}));
    expect(mockAPI.alertAction).not.toHaveBeenCalled();
  });
  it("filters alert status on the server",async()=>{
    render(<ObservabilityDashboard/>);open("Alerts");await screen.findByText(alertFixture.title);
    fireEvent.change(screen.getByRole("combobox",{name:"Alert status"}),{target:{value:"open"}});
    await waitFor(()=>expect(mockAPI.alerts).toHaveBeenCalledWith(1,"open"));
  });
  it("filters requests by path and HTTP method",async()=>{
    render(<ObservabilityDashboard/>);open("Requests");
    await screen.findByText(requestFixture.path);
    fireEvent.change(screen.getByRole("textbox",{name:"Filter request path"}),{target:{value:"/api/orders"}});
    fireEvent.change(screen.getByRole("combobox",{name:"HTTP method"}),{target:{value:"POST"}});
    fireEvent.click(screen.getByRole("button",{name:"Apply filter"}));
    await waitFor(()=>expect(mockAPI.requests).toHaveBeenCalledWith(1,"/api/orders","POST"));
  });
  it("paginates without following arbitrary next URLs",async()=>{
    mockAPI.requests.mockResolvedValue(paged([requestFixture],{next:"https://untrusted.invalid/?token=secret",count:55}));
    render(<ObservabilityDashboard/>);open("Requests");await screen.findByText(requestFixture.path);
    fireEvent.click(screen.getByRole("button",{name:"Next"}));
    await waitFor(()=>expect(mockAPI.requests).toHaveBeenCalledWith(2,"",""));
  });
  it("only renders error message for accounts allowed sensitive fields",async()=>{
    asRole(operatorAccess);
    const {unmount}=render(<ObservabilityDashboard/>);open("Errors");await screen.findByText("DatabaseError");
    expect(screen.queryByText("Sensitive exception details")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Resolve error"})).not.toBeInTheDocument();
    unmount();asRole(adminAccess);
    render(<ObservabilityDashboard/>);open("Errors");await screen.findByText("DatabaseError");
    expect(screen.getByText("Sensitive exception details")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Resolve error"})).toBeInTheDocument();
  });
  it("creates incident from existing error, and resolves error only with permission",async()=>{
    render(<ObservabilityDashboard/>);open("Errors");await screen.findByText("DatabaseError");
    fireEvent.click(screen.getByRole("button",{name:"Create incident"}));
    await waitFor(()=>expect(mockAPI.createIncidentFromError).toHaveBeenCalledWith(errorFixture));
    await waitFor(()=>expect(screen.getByRole("button",{name:"Resolve error"})).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button",{name:"Resolve error"}));
    await waitFor(()=>expect(mockAPI.resolveError).toHaveBeenCalledWith("error-1"));
  });
  it("shows Celery task rows and audit rows to permitted users only",async()=>{
    render(<ObservabilityDashboard/>);open("Celery Tasks");
    expect(await screen.findByText("sync_orders")).toBeInTheDocument();
    open("Audit");expect(await screen.findByText("Incident updated")).toBeInTheDocument();
  });
  it("shows list API error without inventing empty records",async()=>{
    mockAPI.alerts.mockRejectedValue(new Error("server failed"));
    render(<ObservabilityDashboard/>);open("Alerts");
    expect(await screen.findByRole("alert")).toHaveTextContent("A safe error message");
    expect(mockAPI.alerts).toHaveBeenCalled();
  });
  it("exposes correctly formatted metrics, missing data and invalid dates",()=>{
    expect(formatCount(12345)).toBe("12,345");
    expect(formatCount(null)).toBe("—");
    expect(metricNumber("12.3",2)).toBe("12.30");
    expect(metricNumber(null)).toBe("—");
    expect(dateLabel("not-a-date")).toBe("—");
  });
});
