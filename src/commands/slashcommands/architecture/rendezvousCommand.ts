import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { OptionValidationErrorOutcome, SlashCommandDescribedOutcome, isValidationErrorOutcome } from '../../../types/outcome.js';
import { LimitedCommandInteraction, limitCommandInteraction } from '../../../types/limitedCommandInteraction.js';

export interface RendezvousCommand<O, S, T1> {
    readonly interfacer: SlashCommandBuilder | undefined;
    readonly replyer: (interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome) => Promise<void>;
    readonly describer: (outcome: O) => SlashCommandDescribedOutcome; // TODO: Generalize a DescribedOutcome type when/as needed
    readonly validator: (interaction: LimitedCommandInteraction) => Promise<S | OptionValidationErrorOutcome<T1>>; // Generics for solverParams or (e.g. OptionValidationError)Outcome
    readonly solver: (solverParams: S) => Promise<O>;

    readonly execute: (interaction: CommandInteraction) => Promise<void>;
}

export class RendezvousSlashCommand<O, S, T1> implements RendezvousCommand<O, S, T1> {
    constructor(
        public readonly interfacer: SlashCommandBuilder,
        public readonly replyer: (interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome) => Promise<void>,
        public readonly describer: (outcome: O) => SlashCommandDescribedOutcome,
        public readonly validator: (interaction: LimitedCommandInteraction) => Promise<S | OptionValidationErrorOutcome<T1>>,
        public readonly solver: (solverParams: S) => Promise<O>,
    ) {
        this.interfacer = interfacer;
        this.replyer = replyer;
        this.describer = describer;
        this.validator = validator;
        this.solver = solver;
    }

    public async execute(interaction: CommandInteraction) {
        // Preprocessing step: remove unneeded properties from the interaction
        const limitedCommandInteraction = limitCommandInteraction(interaction);
        // Validator step
        const solverParamsOrValidationErrorOutcome = await this.validator(limitedCommandInteraction);
        let outcome: O; // Minimize code duplication from validation result branching
        if (isValidationErrorOutcome(solverParamsOrValidationErrorOutcome)) {
            // Validation failed: skip solver step
            // The double cast will eventually error when a command provides an incorrect type for O.
            outcome = solverParamsOrValidationErrorOutcome as OptionValidationErrorOutcome<T1> as unknown as O;
        } else {
            // Validation succeeded: proceed to solver step
            outcome = await this.solver(solverParamsOrValidationErrorOutcome as S);
        }
        // Describer step
        const describedOutcome = this.describer(outcome);
        // Replyer step
        await this.replyer(interaction, describedOutcome);
    }
}