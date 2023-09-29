export class DuplicateSubdocumentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DuplicateSubdocumentError';
    }
}

/**
 * This error is currently unused in the codebase. In most use cases, it is preferable to use the 
 * getOrCreateGuildSettings() function rather than throw and/or handle this error manually.
 */
export class NonexistentGuildError extends Error {
    constructor(_: string) {
        super(`Guild with ID does not exist in the database.`);
        this.name = 'NonexistentGuildError';
    }
}

/**
 * For error handling near user-facing code, this abstract class provides an additional property 
 * `userMessage` extending classes can use to provide a response to the user's slash command
 * indicating what went wrong.
 */
export abstract class UserFacingError extends Error {
    constructor(message: string, public readonly userMessage: string) {
        super(message);
        this.name = 'UserFacingError';
    }
}

/**
 * A 'base' `UserFacingError` class for errors that do not have a specific type.
 */
export class UserMessageError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'UserMessageError';
    }
}