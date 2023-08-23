/**
 * Includes all parameters that can be updated in a Tournament.
 */
export interface UpdateTournamentParams {
    name?: string;
    photoURI?: string;
    active?: boolean;
    statusDescription?: string;
    visibility?: boolean;
    duration?: string;
}