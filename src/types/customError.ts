export class DuplicateSubdocumentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DuplicateSubdocumentError';
    }
}