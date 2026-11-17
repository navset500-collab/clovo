export const MIN_DESCRIPTION_WORDS = 50;
export const MIN_AUDIENCE_WORDS = 6;
export function wordCount(text: string) {
  return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
}
export function needsClarification(brief: {
  missingEssentials: string[];
  clarifyingQuestions: string[];
}) {
  return (
    brief.missingEssentials.length > 0 && brief.clarifyingQuestions.length > 0
  );
}
