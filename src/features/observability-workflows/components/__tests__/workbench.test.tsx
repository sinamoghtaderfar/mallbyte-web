import { useAuthStore } from "@/features/auth/auth-store";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorText, workflowAPI } from "../../api";
import { admin, diagnosis, incident, incidentEvent, operation, operator, page, viewer } from "../../fixtures";
import type { WorkflowAccess } from "../../types";
import { useWorkflowAccess } from "../route";
import { WorkflowWorkbench } from "../workbench";

vi.mock("../../api",()=>({
  workflowAPI:{listIncidents:vi.fn(),createIncident:vi.fn(),incidentEvents:vi.fn(),diagnoses:vi.fn(),transition:vi.fn(),assign:vi.fn(),comment:vi.fn(),diagnose:vi.fn(),listOperations:vi.fn(),requestOperation:vi.fn(),operationAction:vi.fn()},
  errorText:vi.fn(),
}));
vi.mock("../route",()=>({useWorkflowAccess:vi.fn()}));
vi.mock("@/features/auth/auth-store",()=>({useAuthStore:vi.fn()}));
const a={
  listIncidents:vi.mocked(workflowAPI.listIncidents),createIncident:vi.mocked(workflowAPI.createIncident),
  incidentEvents:vi.mocked(workflowAPI.incidentEvents),diagnoses:vi.mocked(workflowAPI.diagnoses),
  transition:vi.mocked(workflowAPI.transition),assign:vi.mocked(workflowAPI.assign),comment:vi.mocked(workflowAPI.comment),
  diagnose:vi.mocked(workflowAPI.diagnose),listOperations:vi.mocked(workflowAPI.listOperations),
  requestOperation:vi.mocked(workflowAPI.requestOperation),operationAction:vi.mocked(workflowAPI.operationAction),
};
function asRole(access: WorkflowAccess){vi.mocked(useWorkflowAccess).mockReturnValue(access);}
const selectIncident=async()=>{
  fireEvent.click(await screen.findByRole("button",{name:/Checkout exception/}));
  return screen.findByText("Assigned user ID: Unassigned");
};
const selectOps=()=>fireEvent.click(screen.getByRole("button",{name:"Operations"}));
function init(){
  asRole(admin);
  vi.mocked(useAuthStore).mockImplementation((pick)=>pick({user:{id:12}} as never));
  vi.mocked(errorText).mockImplementation(()=>"Safe workflow error");
  a.listIncidents.mockResolvedValue(page([incident]));
  a.listOperations.mockResolvedValue(page([operation]));
  a.incidentEvents.mockResolvedValue([incidentEvent]);
  a.diagnoses.mockResolvedValue([diagnosis]);
  a.createIncident.mockResolvedValue(incident);
  a.assign.mockResolvedValue(incident);
  a.transition.mockResolvedValue(incident);
  a.comment.mockResolvedValue(undefined);
  a.diagnose.mockResolvedValue(diagnosis);
  a.requestOperation.mockResolvedValue(operation);
  a.operationAction.mockResolvedValue(undefined);
}
beforeEach(()=>{vi.resetAllMocks();init();});

describe("Incident and operations workbench",()=>{
  it("fetches incident and operation pages and renders counts",async()=>{
    render(<WorkflowWorkbench/>);
    expect(await screen.findByText("Recent incidents")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:/Checkout exception/})).toBeInTheDocument();
    expect(a.listIncidents).toHaveBeenCalledWith(1);
    expect(a.listOperations).toHaveBeenCalledWith(1);
  });
  it("viewer sees incident list but no create, assign, AI or operations actions",async()=>{
    asRole(viewer);render(<WorkflowWorkbench/>);
    await screen.findByRole("button",{name:/Checkout exception/});
    expect(screen.queryByRole("heading",{name:"Create incident"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Operations"})).not.toBeInTheDocument();
    await selectIncident();
    expect(screen.queryByRole("button",{name:"Request diagnosis"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Assign"})).not.toBeInTheDocument();
    expect(a.listOperations).not.toHaveBeenCalled();
    expect(a.diagnoses).not.toHaveBeenCalled();
  });
  it("operator can create a technical incident without invoking Groq",async()=>{
    asRole(operator);render(<WorkflowWorkbench/>);await screen.findByRole("heading", { name: "Create incident" });
    fireEvent.change(screen.getByRole("textbox",{name:"Incident title"}),{target:{value:"Redis unhealthy during checkout"}});
    fireEvent.change(screen.getByRole("textbox",{name:"Incident description"}),{target:{value:"Synthetic test without customer data"}});
    fireEvent.change(screen.getByRole("combobox",{name:"Severity"}),{target:{value:"high"}});
    fireEvent.click(screen.getByRole("button",{name:"Create incident"}));
    await waitFor(()=>expect(a.createIncident).toHaveBeenCalledWith(expect.objectContaining({
      title:"Redis unhealthy during checkout",description:"Synthetic test without customer data",severity:"high",
    })));
    expect(a.diagnose).not.toHaveBeenCalled();
  });
  it("assigns an incident to a staff user ID",async()=>{
    render(<WorkflowWorkbench/>);await selectIncident();
    fireEvent.change(screen.getByRole("spinbutton",{name:"Assignee user ID"}),{target:{value:"42"}});
    fireEvent.click(screen.getByRole("button",{name:"Assign"}));
    await waitFor(()=>expect(a.assign).toHaveBeenCalledWith("incident-1",42));
  });
  it("transitions an incident and stores a note",async()=>{
    render(<WorkflowWorkbench/>);await selectIncident();
    fireEvent.change(screen.getByRole("combobox",{name:"Next incident status"}),{target:{value:"investigating"}});
    fireEvent.change(screen.getByPlaceholderText(/Reason or resolution note/),{target:{value:"Investigating alert source"}});
    fireEvent.click(screen.getByRole("button",{name:"Save status"}));
    await waitFor(()=>expect(a.transition).toHaveBeenCalledWith("incident-1","investigating","Investigating alert source"));
  });
  it("shows timeline and posts comments without AI calls",async()=>{
    render(<WorkflowWorkbench/>);await selectIncident();
    expect(await screen.findByText(/Incident opened/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Reason or resolution note/),{target:{value:"Incident reproduced"}});
    fireEvent.click(screen.getByRole("button",{name:"Add note as comment"}));
    await waitFor(()=>expect(a.comment).toHaveBeenCalledWith("incident-1","Incident reproduced"));
  });
  it("keeps diagnosis button disabled without explicit consent or evidence selection",async()=>{
    render(<WorkflowWorkbench/>);await selectIncident();
    expect(screen.getByText(/no linked Error Log/)).toBeInTheDocument();
    const diagnose=screen.getByRole("button",{name:"Request diagnosis"});
    expect(diagnose).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox",{name:/I consent to sending/}));
    expect(diagnose).toBeDisabled();
    expect(a.diagnose).not.toHaveBeenCalled();
  });
  it("submits AI request only with consent and explicit description approval",async()=>{
    render(<WorkflowWorkbench/>);await selectIncident();
    await screen.findByText(/Verify Redis connectivity/);
    fireEvent.click(screen.getByRole("checkbox",{name:/I consent to sending/}));
    fireEvent.click(screen.getByRole("checkbox",{name:/I explicitly agree/}));
    fireEvent.click(screen.getByRole("button",{name:"Request diagnosis"}));
    await waitFor(()=>expect(a.diagnose).toHaveBeenCalledWith("incident-1",true));
    expect(a.diagnoses).toHaveBeenCalledWith("incident-1");
  });
  it("renders queued, succeeded, failed AI outputs without running them automatically",async()=>{
    a.diagnoses.mockResolvedValue([
      {...diagnosis,id:"d-queued",status:"queued",response:""},diagnosis,
      {...diagnosis,id:"d-failed",status:"failed",response:"Diagnosis unavailable."},
    ]);
    render(<WorkflowWorkbench/>);await selectIncident();
    expect(await screen.findByText("Waiting for the Celery worker…")).toBeInTheDocument();
    expect(screen.getByText(/Verify Redis connectivity/)).toBeInTheDocument();
    expect(screen.getByText("Diagnosis unavailable.")).toBeInTheDocument();
    expect(a.diagnose).not.toHaveBeenCalled();
  });
  it("allows permitted operators to request a restart but does not execute one in UI",async()=>{
    asRole(operator);render(<WorkflowWorkbench/>);
    await screen.findByText("Recent incidents");selectOps();
    fireEvent.change(screen.getByPlaceholderText(/Describe failed checks/),{target:{value:"Celery tasks stopped after deployment"}});
    fireEvent.click(screen.getByRole("button",{name:"Submit request"}));
    await waitFor(()=>expect(a.requestOperation).toHaveBeenCalledWith("celery_worker","Celery tasks stopped after deployment"));
    expect(a.operationAction).not.toHaveBeenCalled();
  });
  it("admin can approve/reject/cancel a different user's pending operation",async()=>{
    render(<WorkflowWorkbench/>);await screen.findByText("Recent incidents");selectOps();
    expect(await screen.findByText(/Worker stopped processing/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Approve"}));
    await waitFor(()=>expect(a.operationAction).toHaveBeenCalledWith("op-1","approve"));
    await waitFor(()=>expect(screen.getByRole("button",{name:"Reject"})).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button",{name:"Reject"}));
    await waitFor(()=>expect(a.operationAction).toHaveBeenCalledWith("op-1","reject"));
    await waitFor(()=>expect(screen.getByRole("button",{name:"Cancel"})).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button",{name:"Cancel"}));
    await waitFor(()=>expect(a.operationAction).toHaveBeenCalledWith("op-1","cancel"));
  });
  it("operator cannot approve operations",async()=>{
    asRole(operator);render(<WorkflowWorkbench/>);await screen.findByText("Recent incidents");selectOps();
    await screen.findByText(/Worker stopped processing/);
    expect(screen.queryByRole("button",{name:"Approve"})).not.toBeInTheDocument();
  });
  it("warns approver when requester is the same user",async()=>{
    vi.mocked(useAuthStore).mockImplementation((pick)=>pick({user:{id:11}} as never));
    render(<WorkflowWorkbench/>);await screen.findByText("Recent incidents");selectOps();
    expect(await screen.findByText(/A separate administrator must approve this request/)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Approve"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Reject"})).not.toBeInTheDocument();
  });
  it("shows safe errors when request fails",async()=>{
    a.createIncident.mockRejectedValue(new Error("private backend error"));
    render(<WorkflowWorkbench/>);await screen.findByRole("heading", { name: "Create incident" });
    fireEvent.change(screen.getByRole("textbox",{name:"Incident title"}),{target:{value:"Synthetic incident failure"}});
    fireEvent.click(screen.getByRole("button",{name:"Create incident"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Safe workflow error");
    expect(screen.queryByText("private backend error")).not.toBeInTheDocument();
  });
  it("paginates incident and operation collections locally",async()=>{
    a.listIncidents.mockResolvedValue(page([incident],"/api/next?secret=1"));
    a.listOperations.mockResolvedValue(page([operation],"/api/next?secret=1"));
    render(<WorkflowWorkbench/>);await screen.findByText("Recent incidents");
    fireEvent.click(screen.getByRole("button",{name:"Next"}));
    await waitFor(()=>expect(a.listIncidents).toHaveBeenCalledWith(2));
    selectOps();
    fireEvent.click(screen.getByRole("button",{name:"Next"}));
    await waitFor(()=>expect(a.listOperations).toHaveBeenCalledWith(2));
  });
});
