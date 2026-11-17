import type { Readiness } from "./scoring";
export type Language = "en" | "es";
export type AgentId = "mira" | "sora" | "juno" | "rook" | "leo" | "vera";
export type AgentStatus = "waiting" | "running" | "done" | "error";
export type EvidenceImage = { id: string; name: string; data: string };
export type Attachment = EvidenceImage & {
  kind: "image" | "pdf" | "video-frame";
};
export type ProjectInput = {
  accessCode?: string;
  name: string;
  description: string;
  audience: string;
  task: string;
  url: string;
  stage: "idea" | "prototype" | "launched";
  language: Language;
  attachments: Attachment[];
};
export type AgentTrace = {
  input: string;
  output: string;
  durationMs: number;
  details: { title: string; detail: string }[];
};
export type Persona = {
  name: string;
  role: string;
  situation: string;
  reaction: string;
  useful: string;
  friction: string;
  alternative: string;
  wouldTry: "yes" | "maybe" | "no";
  condition: string;
};
export type Source = {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  retrievedAt?: string;
};
export type Market = {
  summary: string;
  signals: {
    title: string;
    detail: string;
    evidenceType?: "provider-claim" | "research" | "reported-experience";
    relevance?: string;
    citations?: { sourceId: string; quote: string }[];
    sourceIds: string[];
  }[];
  alternatives: {
    name: string;
    difference: string;
    citations?: { sourceId: string; quote: string }[];
    sourceIds: string[];
  }[];
  unknowns: string[];
  sources: Source[];
  grounded: boolean;
  searchNotice: string;
  provider?: string;
  queries?: string[];
  searchHtml?: string;
};
export type EvidenceSource = {
  id: string;
  kind: "brief" | "audience" | "question" | "attachment";
  label: string;
  text: string;
  attachmentId?: string;
};
export type Citation = {
  sourceId: string;
  quote: string;
  location: string;
  verification: "text-match" | "file-interpretation";
};
export type Concern = {
  id: string;
  title: string;
  evidence: string;
  risk: string;
  test: string;
  citations: Citation[];
  basis: "brief-supported" | "file-interpretation" | "hypothesis";
};
export type RunEvent = {
  at: number;
  agent: AgentId;
  status: AgentStatus;
  message: string;
  persona?: number;
};
export type Report = {
  id: string;
  createdAt: string;
  language: Language;
  mode: "live" | "example";
  readiness?: Readiness;
  model: string;
  summary: string;
  brief: {
    product: string;
    problem: string;
    strengths: string[];
    assumptions: string[];
    evidence: string[];
  };
  market: Market;
  personas: Persona[];
  critique: Concern[];
  improvements: {
    findingIds: string[];
    title: string;
    change: string;
    why: string;
    effort: string;
    check: string;
  }[];
  experiment: {
    task: string;
    questions: string[];
    successSignal: string;
    recruit: string;
  };
  durationMs: number;
  evidenceSources: EvidenceSource[];
  runEvents: RunEvent[];
  traces: Partial<Record<AgentId, AgentTrace>>;
};
export type Review = { input: ProjectInput; report: Report };
export type AnalysisEvent =
  | {
      type: "agent";
      at?: number;
      agent: AgentId;
      status: AgentStatus;
      message: string;
      trace?: AgentTrace;
    }
  | {
      type: "panel-status";
      at: number;
      index: number;
      status: AgentStatus;
      message: string;
    }
  | { type: "panel"; index: number; persona: Persona }
  | { type: "result"; report: Report }
  | { type: "clarify"; questions: string[] }
  | { type: "error"; message: string; code?: string };
export type Study = {
  id: string;
  name: string;
  description: string;
  url: string;
  task: string;
  questions: string[];
  language: Language;
  createdAt: string;
  expiresAt: string;
};
export type StudyAccess = {
  id: string;
  ownerKey: string;
  name: string;
  expiresAt: string;
};
export type HumanResponse = {
  id: string;
  createdAt: string;
  use: "yes" | "maybe" | "no";
  frequency: "daily" | "weekly" | "monthly" | "rarely" | "never";
  problem: string;
  feedback: string;
  answers: string[];
};
