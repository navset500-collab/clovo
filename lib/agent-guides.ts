import type { AgentId } from "./types";
type Guide = {
  input: [string, string];
  output: [string, string];
  steps: [string[], string[]];
  limit: [string, string];
  handoff: [string, string];
};
export const AGENT_GUIDES: Record<AgentId, Guide> = {
  mira: {
    input: [
      "Your description, audience, goal, and any PDFs, images or sampled video frames.",
      "Tu descripción, público, objetivo, PDF, imágenes o fotogramas.",
    ],
    output: [
      "A shared understanding of the problem, workflow, strengths and unknowns.",
      "Una comprensión común del problema, proceso, fortalezas e incógnitas.",
    ],
    steps: [
      [
        "Reads the actual material instead of assuming what the product does.",
        "Asks focused questions if the core problem, audience or workflow is unclear.",
        "Gives the next agents a concise brief and topic-specific research queries.",
      ],
      [
        "Lee el material real sin suponer qué hace el producto.",
        "Hace preguntas concretas si faltan el problema, público o proceso.",
        "Entrega un resumen y consultas de investigación específicas.",
      ],
    ],
    limit: [
      "A prototype link alone cannot be inspected. The team needs your description or uploaded evidence.",
      "Un enlace por sí solo no se puede analizar. El equipo necesita tu descripción o archivos.",
    ],
    handoff: ["Mira → Sora + Juno", "Mira → Sora + Juno"],
  },
  sora: {
    input: [
      "Mira’s brief, the intended audience, and two focused research queries.",
      "El resumen de Mira, el público y dos consultas concretas.",
    ],
    output: [
      "Relevant public signals, competing alternatives, linked excerpts and the gaps that still need research.",
      "Señales públicas relevantes, alternativas, extractos enlazados y preguntas abiertas.",
    ],
    steps: [
      [
        "Searches for the actual problem and alternatives using public web sources.",
        "Separates what a source says from what it could mean for your idea.",
        "Keeps findings only when their quoted support matches a retrieved excerpt.",
      ],
      [
        "Busca el problema y sus alternativas en fuentes públicas.",
        "Separa lo que dice una fuente de lo que podría significar para tu idea.",
        "Conserva hallazgos solo cuando sus citas coinciden con los extractos recuperados.",
      ],
    ],
    limit: [
      "A competitor’s website is evidence of its offering, not proof of customer adoption or demand for your product.",
      "La web de un competidor demuestra su oferta, no adopción ni demanda de tu producto.",
    ],
    handoff: ["Sora + Juno → Rook", "Sora + Juno → Rook"],
  },
  juno: {
    input: [
      "The original project description, intended audience, uploaded material and Mira’s brief.",
      "La descripción original, el público, los archivos y el resumen de Mira.",
    ],
    output: [
      "Five distinct fictional perspectives: core value, existing habits, access, trust and reasons not to use the product.",
      "Cinco perspectivas ficticias: valor principal, hábitos, acceso, confianza y motivos para no usar el producto.",
    ],
    steps: [
      [
        "Plans five profiles, then evaluates their distinct viewpoints together in one AI request to conserve free quota.",
        "Varies relevant ages, resources, experience and circumstances within the actual audience; demographic stereotypes are not evidence.",
        "Explores useful outcomes, obstacles, current alternatives and conditions for trying it.",
      ],
      [
        "Planifica cinco perfiles y evalúa sus perspectivas en una sola solicitud de IA para conservar la cuota gratuita.",
        "Varía edades, recursos, experiencia y situaciones relevantes dentro del público; los estereotipos no son evidencia.",
        "Explora resultados útiles, obstáculos, alternativas y condiciones de uso.",
      ],
    ],
    limit: [
      "These are AI simulations. They have not used your product and their reactions are not research participants or votes.",
      "Son simulaciones de IA. No han usado tu producto y sus respuestas no son entrevistas ni votos.",
    ],
    handoff: ["Juno + Sora → Rook", "Juno + Sora → Rook"],
  },
  rook: {
    input: [
      "The original source material, Mira’s brief, Sora’s research and Juno’s simulated reactions.",
      "El material original, resumen de Mira, investigación de Sora y reacciones simuladas.",
    ],
    output: [
      "Prioritized concerns, source-linked evidence, testable questions and a transparent readiness rubric.",
      "Preocupaciones priorizadas, evidencia enlazada, preguntas comprobables y una rúbrica de preparación.",
    ],
    steps: [
      [
        "Ranks demand, adoption, experience and feasibility failure modes, then asks what evidence could weaken each criticism.",
        "Links each concern to original material; unmatched claims become hypotheses.",
        "Assesses problem clarity, audience focus, proposed value and testability.",
      ],
      [
        "Prioriza fallos de demanda, adopción, experiencia y viabilidad y pide evidencia que podría debilitar cada crítica.",
        "Relaciona preocupaciones con material original; lo no respaldado queda como hipótesis.",
        "Evalúa claridad del problema, público, valor y facilidad de prueba.",
      ],
    ],
    limit: [
      "A matching quote proves that the text was supplied. It does not prove that the underlying claim is true.",
      "Una cita coincidente prueba que el texto fue aportado, no que la afirmación sea cierta.",
    ],
    handoff: ["Rook → Leo", "Rook → Leo"],
  },
  leo: {
    input: [
      "The concerns Rook identified, the project brief and the simulated objections.",
      "Las preocupaciones de Rook, el resumen y las objeciones simuladas.",
    ],
    output: [
      "A short, prioritized build plan with specific changes and observable completion checks.",
      "Un plan breve y priorizado con cambios concretos y criterios de finalización.",
    ],
    steps: [
      [
        "Chooses the smallest useful change or experiment before proposing more features.",
        "Connects every recommendation to a specific concern.",
        "Proposes simpler alternative directions, with tradeoffs and a cheap test before committing to a pivot.",
      ],
      [
        "Prioriza el cambio o experimento útil más pequeño.",
        "Relaciona cada recomendación con una preocupación concreta.",
        "Propone direcciones más sencillas, con sacrificios y una prueba pequeña antes de cambiar de rumbo.",
      ],
    ],
    limit: [
      "Effort is qualitative. The agent cannot know your codebase, development speed or implementation constraints.",
      "El esfuerzo es cualitativo. El agente no conoce tu código, ritmo ni limitaciones técnicas.",
    ],
    handoff: ["Leo → Vera", "Leo → Vera"],
  },
  vera: {
    input: [
      "The proposed improvements, the key concerns and the audience you described.",
      "Las mejoras propuestas, preocupaciones principales y público descrito.",
    ],
    output: [
      "A neutral task, focused interview questions, recruitment guidance and a real feedback form.",
      "Una tarea neutral, preguntas concretas, orientación para reclutar y un formulario real.",
    ],
    steps: [
      [
        "Turns the biggest uncertainty into something a person can respond to.",
        "Asks about past behavior and present workarounds, not only whether an idea sounds good.",
        "Prepares a link you can share after reviewing exactly what it contains.",
      ],
      [
        "Convierte la incertidumbre principal en una pregunta para personas.",
        "Pregunta por comportamientos y soluciones actuales, no solo opiniones.",
        "Prepara un enlace cuyo contenido puedes revisar antes de compartir.",
      ],
    ],
    limit: [
      "You invite real participants. Anonymous responses are self-selected and do not verify someone’s identity.",
      "Tú invitas a los participantes. Las respuestas anónimas son voluntarias y no verifican identidad.",
    ],
    handoff: ["Vera → People you invite", "Vera → Personas que invites"],
  },
};
