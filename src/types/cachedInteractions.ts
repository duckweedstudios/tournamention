import { Snowflake } from 'discord.js';
import { ChallengesSolverParams, challengesSolver, challengesSlashCommandDescriptions, ChallengesStatus } from '../commands/slashcommands/challenges.js';
import { TournamentionClient } from './client.js';
import { defaultSlashCommandDescriptions } from './defaultSlashCommandDescriptions.js';
import { SlashCommandDescribedOutcome, SlashCommandEmbedDescribedOutcome, Outcome, OutcomeStatus } from './outcome.js';
import { PaginatedSolverParams } from './paginatedSolverParams.js';
import { PendingSubmissionsSolverParams, PendingSubmissionsStatus, pendingSubmissionsSlashCommandDescriptions, pendingSubmissionsSolver } from '../commands/slashcommands/pending-submissions/pending-submissions-exports.js';

enum CachedInteractionType {
    DEFAULT = 'DEFAULT',
    CHALLENGES = 'CHALLENGES',
    PENDING_SUBMISSIONS = 'PENDING_SUBMISSIONS',
}

type BaseCacheParams = {
    client: TournamentionClient;
    messageId: Snowflake;
    senderId: string;
}

export type PaginatedCacheParams = BaseCacheParams & {
    totalPages: number;
}

export interface CachedInteraction {
    messageId: Snowflake;
    senderId: string;
    type: CachedInteractionType;
    totalPages: number;
    solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome>;
}

export class Cacher {
    constructor(
        public readonly solverParams: PaginatedSolverParams,
    ) {
        this.solverParams = solverParams;
    }

    public setPage(page: number): void {
        this.solverParams.page = page;
    }
}

/**
 * A class meant to be used for type-matching only.
 */
export class CacherCachedInteraction extends Cacher implements CachedInteraction {
    public type: CachedInteractionType = CachedInteractionType.DEFAULT;
    constructor(
        public readonly messageId: Snowflake,
        public readonly senderId: string,
        solverParams: PaginatedSolverParams, 
        public readonly totalPages: number,
    ) {
        super(solverParams);
        this.messageId = messageId;
        this.senderId = senderId;
        this.totalPages = totalPages;
    }

    public setPage(_page: number): void {
        throw new Error(`Error in cachedInteractions.ts: CacherCachedInteraction is a type-matching class only and setPage() should not be called on it.`);
    }

    public async solveAgainAndDescribe(_page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome> {
        throw new Error(`Error in cachedInteractions.ts: CacherCachedInteraction is a type-matching class only and solveAgainAndDescribe() should not be called on it.`);
    }
}

export class CachedChallengesInteraction extends Cacher implements CachedInteraction {
    public type: CachedInteractionType = CachedInteractionType.CHALLENGES;
    constructor(
        public readonly messageId: Snowflake,
        public readonly senderId: string,
        solverParams: ChallengesSolverParams,
        public readonly totalPages: number,
    ) {
        super(solverParams);
        this.messageId = messageId;
        this.senderId = senderId;
        this.totalPages = totalPages;
    }

    public setPage(page: number): void {
        this.solverParams.page = page;
    }

    public async solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome> {
        const outcome = await challengesSolver({ ...(this.solverParams as ChallengesSolverParams), page });
        if (challengesSlashCommandDescriptions.has(outcome.status as ChallengesStatus)) return challengesSlashCommandDescriptions.get(outcome.status as ChallengesStatus)!(outcome);
        // Fallback to trying default descriptions
        const defaultOutcome = outcome as unknown as Outcome<string>;
        if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
            return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
        } else return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
    }

    public static readonly cacheParams: PaginatedCacheParams & {
        solverParams: ChallengesSolverParams;
    };

    public static async cache(cacheParams: typeof CachedChallengesInteraction.cacheParams): Promise<void> {
        const { client, messageId, senderId, solverParams } = cacheParams;
        const interaction = new CachedChallengesInteraction(messageId, senderId, solverParams, cacheParams.totalPages);
        client.cacheInteraction(messageId, interaction);
    }
}

export class CachedPendingSubmissionsInteraction extends Cacher implements CachedInteraction {
    public type: CachedInteractionType = CachedInteractionType.PENDING_SUBMISSIONS;
    constructor(
        public readonly messageId: Snowflake,
        public readonly senderId: string,
        solverParams: PendingSubmissionsSolverParams,
        public readonly totalPages: number,
    ) {
        super(solverParams);
        this.messageId = messageId;
        this.senderId = senderId;
        this.totalPages = totalPages;
    }

    public setPage(page: number): void {
        this.solverParams.page = page;
    }

    public async solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome> {
        const outcome = await pendingSubmissionsSolver({ ...(this.solverParams as PendingSubmissionsSolverParams), page });
        if (pendingSubmissionsSlashCommandDescriptions.has(outcome.status as PendingSubmissionsStatus)) return pendingSubmissionsSlashCommandDescriptions.get(outcome.status as PendingSubmissionsStatus)!(outcome);
        // Fallback to trying default descriptions
        const defaultOutcome = outcome as unknown as Outcome<string>;
        if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
            return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
        } else return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
    }

    public static readonly cacheParams: PaginatedCacheParams & {
        solverParams: PendingSubmissionsSolverParams;
    };

    public static async cache(cacheParams: typeof CachedPendingSubmissionsInteraction.cacheParams): Promise<void> {
        const { client, messageId, senderId, solverParams } = cacheParams;
        const interaction = new CachedPendingSubmissionsInteraction(messageId, senderId, solverParams, cacheParams.totalPages);
        client.cacheInteraction(messageId, interaction);
    }
}