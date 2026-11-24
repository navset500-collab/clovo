// Safe diagnostics: retain the failure category and HTTP status, never prompts,
// provider response bodies, credentials, or submitted project material.
export class ModelError extends Error {
  code: string;
  status?: number;
  retryAt?: number;
  quotaKind?: "daily" | "minute" | "unknown";
  constructor(code: string, status?: number, retryAt?: number, quotaKind?: "daily" | "minute" | "unknown") {
    super(code);
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
    this.quotaKind = quotaKind;
  }
}
