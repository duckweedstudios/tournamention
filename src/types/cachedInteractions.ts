import { Snowflake } from 'discord.js';
import { ChallengesSolverParams, challengesSolver, challengesSlashCommandDescriptions, ChallengesStatus } from '../commands/slashcommands/challenges.js';
import { TournamentionClient } from './client.js';
import { defaultSlashCommandDescriptions } from './defaultSlashCommandDescriptions.js';
import { SlashCommandDescribedOutcome, SlashCommandEmbedDescribedOutcome, Outcome, OutcomeStatus } from './outcome.js';

enum CachedInteractionType {
    Challenges = 'CHALLENGES',
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
}

export class CachedChallengesInteraction implements CachedInteraction {
    public type: CachedInteractionType = CachedInteractionType.Challenges;
    constructor(
        public readonly messageId: Snowflake,
        public readonly senderId: string,
        public readonly solverParams: ChallengesSolverParams,
        public readonly totalPages: number,
    ) {
        this.messageId = messageId;
        this.senderId = senderId;
        this.solverParams = solverParams;
    }

    public setPage(page: number): void {
        this.solverParams.page = page;
    }

    public async solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome> {
        const outcome = await challengesSolver({ ...this.solverParams, page });
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