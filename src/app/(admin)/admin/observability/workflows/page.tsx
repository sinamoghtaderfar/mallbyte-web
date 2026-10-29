"use client";
import { WorkflowRoute } from "@/features/observability-workflows/components/route";
import { WorkflowWorkbench } from "@/features/observability-workflows/components/workbench";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
export default function WorkflowPage(){return <WorkflowRoute><div className="bg-slate-50 px-6 pt-5"><div className="mx-auto max-w-7xl"><Link href="/admin/observability" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline"><ArrowLeft size={16}/> Back to monitoring</Link></div></div><WorkflowWorkbench/></WorkflowRoute>;}
