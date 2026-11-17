import { z } from "zod";
import { PANEL_SIZE, PANEL_LENSES } from "./panel.ts";
import {
  wordCount,
  MIN_DESCRIPTION_WORDS,
  MIN_AUDIENCE_WORDS,
} from "./intake.ts";
const prose = z.string().max(1400);
export const safeUrl = z
  .string()
  .max(1500)
  .refine(
    (s) =>
      !s ||
      (() => {
        try {
          const u = new URL(s);
          return (
            ["http:", "https:"].includes(u.protocol) &&
            !u.username &&
            !u.password
          );
        } catch {
          return false;
        }
      })(),
    "Use an http or https link",
  );
export const inputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z
    .string()
    .trim()
    .max(18000)
    .refine(
      (s) => wordCount(s) >= MIN_DESCRIPTION_WORDS,
      "Describe your project in at least 50 words.",
    ),
  audience: z
    .string()
    .trim()
    .max(1000)
    .refine(
      (s) => wordCount(s) >= MIN_AUDIENCE_WORDS,
      "Describe your audience in at least 6 words: who they are, their situation, and a constraint.",
    ),
  task: z.string().trim().max(1500),
  url: safeUrl.default(""),
  stage: z.enum(["idea", "prototype", "launched"]),
  language: z.enum(["en", "es"]).default("en"),
  attachments: z
    .array(
      z
        .object({
          id: z.string().max(80),
          name: z.string().max(200),
          kind: z.enum(["image", "pdf", "video-frame"]),
          data: z
            .string()
            .max(2800000)
            .regex(
              /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/,
            ),
        })
        .refine((f) => {
          const [header, encoded] = f.data.split(",");
          if (!encoded) return false;
          try {
            const b = atob(encoded.slice(0, 32));
            if (header.includes("application/pdf"))
              return f.kind === "pdf" && b.startsWith("%PDF-");
            if (f.kind === "pdf") return false;
            if (header.includes("image/jpeg"))
              return b.startsWith("\xff\xd8\xff");
            if (header.includes("image/png"))
              return b.startsWith("\x89PNG\r\n\x1a\n");
            return b.startsWith("RIFF") && b.slice(8, 12) === "WEBP";
          } catch {
            return false;
          }
        }, "The file content does not match its supported type."),
    )
    .max(8)
    .default([]),
  accessCode: z.string().max(200).optional(),
});
export const briefSchema = z.object({
  missingEssentials: z
    .array(z.enum(["problem", "audience", "workflow"]))
    .max(3),
  decisionFrame: z.object({
    job: z.string().max(600),
    currentAlternative: z.string().max(500),
    successMoment: z.string().max(500),
    keyAssumption: z.string().max(600),
    constraints: z.array(z.string().max(300)).max(4),
  }),
  product: z.string().max(260),
  clarifyingQuestions: z.array(z.string().max(300)).max(3),
  researchQueries: z.array(z.string().max(250)).max(2),
  problem: prose,
  strengths: z.array(prose).max(4),
  assumptions: z.array(prose).max(5),
  evidence: z.array(prose).max(6),
});
export const marketSchema = z.object({
  summary: prose,
  signals: z
    .array(
      z.object({
        title: z.string().max(160),
        detail: prose,
        evidenceType: z.enum([
          "provider-claim",
          "research",
          "reported-experience",
        ]),
        relevance: prose,
        citations: z
          .array(
            z.object({
              sourceId: z.string().max(20),
              quote: z.string().max(350),
            }),
          )
          .max(3),
        sourceIds: z.array(z.string()).max(5),
      }),
    )
    .max(4),
  alternatives: z
    .array(
      z.object({
        name: z.string().max(160),
        difference: prose,
        targetUser: z.string().max(350),
        switchingCost: z.string().max(500),
        opportunity: z.string().max(600),
        citations: z
          .array(
            z.object({
              sourceId: z.string().max(20),
              quote: z.string().max(350),
            }),
          )
          .max(3),
        sourceIds: z.array(z.string()).max(5),
      }),
    )
    .max(4),
  unknowns: z.array(prose).max(5),
});
export const panelPlanSchema = z.object({
  profiles: z
    .array(
      z.object({
        name: z.string().max(50),
        role: z.string().max(150),
        situation: z.string().max(500),
        focus: z.string().max(400),
        ageRange: z.string().max(100),
        context: z.string().max(400),
        lens: z.enum(PANEL_LENSES),
      }),
    )
    .min(PANEL_SIZE)
    .max(PANEL_SIZE),
});
export const personaSchema = z.object({
  nonUseReason: z.string().max(600),
  suggestedChange: z.string().max(600),
  name: z.string().max(80),
  role: z.string().max(140),
  situation: prose,
  reaction: prose,
  useful: prose,
  friction: prose,
  alternative: prose,
  wouldTry: z.enum(["yes", "maybe", "no"]),
  condition: prose,
});
export const critiqueSchema = z.object({
  summary: prose,
  readiness: z
    .array(
      z.object({
        id: z.enum(["problem", "audience", "value", "testability"]),
        rating: z.number().int().min(0).max(4),
        reason: prose,
        nextStep: z.string().max(500),
        citations: z
          .array(
            z.object({
              sourceId: z.string().max(30),
              quote: z.string().max(650),
              location: z.string().max(200),
            }),
          )
          .max(2),
      }),
    )
    .min(4)
    .max(4),
  concerns: z
    .array(
      z.object({
        priority: z.enum(["critical", "important", "minor"]),
        category: z.enum([
          "demand",
          "adoption",
          "experience",
          "feasibility",
          "trust",
          "economics",
        ]),
        counterEvidence: z.string().max(600),
        title: z.string().max(160),
        evidence: prose,
        risk: prose,
        test: prose,
        citations: z
          .array(
            z.object({
              sourceId: z.string().max(30),
              quote: z.string().max(650),
              location: z.string().max(200),
            }),
          )
          .max(3),
      }),
    )
    .min(3)
    .max(5),
});
export const planSchema = z.object({
  directions: z
    .array(
      z.object({
        title: z.string().max(140),
        audience: z.string().max(350),
        approach: z.string().max(600),
        why: z.string().max(500),
        tradeoff: z.string().max(500),
        test: z.string().max(500),
        findingIds: z.array(z.string().max(30)).min(1).max(4),
      }),
    )
    .min(1)
    .max(2),
  summary: prose,
  improvements: z
    .array(
      z.object({
        findingIds: z.array(z.string().max(30)).min(1).max(4),
        title: z.string().max(160),
        change: prose,
        why: prose,
        effort: z.string().max(80),
        check: prose,
        firstStep: z.string().max(500),
        tradeoff: z.string().max(500),
      }),
    )
    .min(1)
    .max(4),
});
export const experimentSchema = z.object({
  hypothesis: z.string().max(500),
  rethinkSignal: z.string().max(600),
  summary: prose,
  task: prose,
  questions: z.array(z.string().max(350)).min(2).max(4),
  successSignal: prose,
  recruit: prose,
});
export const studySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(25).max(5000),
  url: safeUrl,
  task: z.string().max(1400),
  questions: z.array(z.string().max(350)).min(1).max(4),
  language: z.enum(["en", "es"]),
});
export const responseSchema = z.object({
  use: z.enum(["yes", "maybe", "no"]),
  frequency: z.enum(["daily", "weekly", "monthly", "rarely", "never"]),
  problem: z.string().trim().min(5).max(1200),
  feedback: z.string().trim().min(10).max(2500),
  answers: z.array(z.string().trim().max(1000)).max(4),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export function validSourceIds(ids: string[], allowed: string[]) {
  return [...new Set(ids)].filter((id) => allowed.includes(id));
}
