import { Snowflake } from 'discord.js';
import { SlashCommandDescribedOutcome, SlashCommandEmbedDescribedOutcome, OutcomeTypeConstraint } from './outcome.js';
import { PaginatedSolverParams } from './paginatedSolverParams.js';
import { InteractionCacheServiceLocator } from './interactionCacheServiceLocator.js';
import { RendezvousCommand } from '../commands/architecture/rendezvousCommand.js';

export interface CachedInteraction {
    messageId: Snowflake;
    senderId: string;
    totalPages: number;
    solverParams: PaginatedSolverParams;
    solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome>;
    setPage(page: number): void;
    cache(): void;
}

export abstract class BaseCachedInteraction implements CachedInteraction {
    constructor(
        public readonly messageId: Snowflake,
        public readonly senderId: string,
        public readonly totalPages: number,
        public readonly solverParams: PaginatedSolverParams,
    ) {
        this.solverParams = solverParams;
    }

    public abstract solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome>;

    public setPage(page: number): void {
        this.solverParams.page = page;
    }

    public cache(): void {
        InteractionCacheServiceLocator.getService().cacheInteraction(this.messageId, this);
    }
}

export class CachedCommandInteraction<O extends OutcomeTypeConstraint, S, T1> extends BaseCachedInteraction {
    constructor(
        public readonly command: RendezvousCommand<O, S, T1>,
        messageId: Snowflake,
        senderId: string,
        solverParams: S,
        totalPages: number,
    ) {
        super(messageId, senderId, totalPages, solverParams as unknown as PaginatedSolverParams);
    }

    public async solveAgainAndDescribe(page: number): Promise<SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome> {
        const outcome = await this.command.solver({ ...(this.solverParams as unknown as S), page });
        return this.command.describer(outcome);
    }
}