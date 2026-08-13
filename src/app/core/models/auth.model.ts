export interface AuthResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
  email?: string;
}
