import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { OptionValidationErrorOutcome, Outcome, SlashCommandDescribedOutcome, isValidationErrorOutcome } from '../../../types/outcome.js';
import { LimitedCommandInteraction, limitCommandInteraction } from '../../../types/limitedCommandInteraction.js';

export interface RendezvousCommand<S, T1, T2 = void> {
    readonly interfacer: SlashCommandBuilder | undefined;
    readonly replyer: (describedOutcome: SlashCommandDescribedOutcome) => Promise<void>;
    readonly describer: (outcome: Outcome<T1, T2>) => SlashCommandDescribedOutcome; // TODO: Generalize a DescribedOutcome type when/as needed
    readonly validator: (interaction: LimitedCommandInteraction) => Promise<S> | Outcome<T1, T2>; // Generics for solverParams or (e.g. OptionValidationError)Outcome
    readonly solver: (solverParams: S) => Promise<Outcome<T1, T2>>;

    readonly execute: (interaction: CommandInteraction) => Promise<void>;
}

export class RendezvousSlashCommand<S, T1, T2 = void> implements RendezvousCommand<S, T1, T2> {
    constructor(
        public readonly interfacer: SlashCommandBuilder,
        public readonly replyer: (describedOutcome: SlashCommandDescribedOutcome) => Promise<void>,
        public readonly describer: (outcome: Outcome<T1, T2>) => SlashCommandDescribedOutcome,
        public readonly validator: (interaction: LimitedCommandInteraction) => Promise<S> | OptionValidationErrorOutcome<T1>,
        public readonly solver: (solverParams: S) => Promise<Outcome<T1, T2>>
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
        let outcome: Outcome<T1, T2>; // Minimize code duplication from validation result branching
        if (isValidationErrorOutcome(solverParamsOrValidationErrorOutcome)) {
            // Validation failed: skip solver step
            outcome = solverParamsOrValidationErrorOutcome as OptionValidationErrorOutcome<T1>;
        } else {
            // Validation succeeded: proceed to solver step
            outcome = await this.solver(solverParamsOrValidationErrorOutcome as S);
        }
        // Describer step
        const describedOutcome = this.describer(outcome);
        // Replyer step
        await this.replyer(describedOutcome);
    }
}
