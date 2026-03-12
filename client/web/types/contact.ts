// ============================================================================
// CONTACT TYPES
// ============================================================================

export interface ContactRequest {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export interface ContactResponse {
    message: string;
}
