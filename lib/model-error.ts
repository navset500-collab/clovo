// Safe diagnostics: retain the failure category and HTTP status, never prompts,
// provider response bodies, credentials, or submitted project material.
export class ModelError extends Error {
  code: string;
  status?: number;
  constructor(code: string, status?: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
