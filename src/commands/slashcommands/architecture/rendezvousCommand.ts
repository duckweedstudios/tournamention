import { CommandInteraction, SlashCommandBuilder } from 'discord.js';
import { DescriptionMap, OptionValidationErrorOutcome, Outcome, OutcomeStatus, OutcomeTypeConstraint, SlashCommandDescribedOutcome, SlashCommandEmbedDescribedOutcome, isEmbedDescribedOutcome, isValidationErrorOutcome } from '../../../types/outcome.js';
import { LimitedCommandInteraction, limitCommandInteraction } from '../../../types/limitedCommandInteraction.js';
import { defaultSlashCommandDescriptions } from '../../../types/defaultSlashCommandDescriptions.js';

export interface RendezvousCommand<O extends OutcomeTypeConstraint, S, T1> {
    readonly interfacer: SlashCommandBuilder | undefined;
    readonly replyer: (interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome) => Promise<void>;
    readonly describer: (outcome: O) => SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome; // TODO: Generalize a DescribedOutcome type when/as needed
    readonly validator: (interaction: LimitedCommandInteraction) => Promise<S | OptionValidationErrorOutcome<T1>>; // Generics for solverParams or (e.g. OptionValidationError)Outcome
    readonly solver: (solverParams: S) => Promise<O>;

    readonly execute: (interaction: CommandInteraction) => Promise<void>;
}

export class RendezvousSlashCommand<O extends OutcomeTypeConstraint, S, T1> implements RendezvousCommand<O, S, T1> {
    public readonly describer: (outcome: O) => SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome;

    constructor(
        public readonly interfacer: SlashCommandBuilder,
        public readonly replyer: (interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome) => Promise<void>,
        describer: (outcome: O) => SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome,
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

    public static async simpleReplyer(interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome) {
        if (isEmbedDescribedOutcome(describedOutcome)) interaction.reply({ embeds: describedOutcome.embeds, components: describedOutcome.components, ephemeral: describedOutcome.ephemeral });
        else interaction.reply({ content: describedOutcome.userMessage, ephemeral: describedOutcome.ephemeral });
    }
}

export class SimpleRendezvousSlashCommand<O extends OutcomeTypeConstraint, S, T1, CommandStatus = OutcomeStatus> extends RendezvousSlashCommand<O, S, T1> {
    constructor(
        interfacer: SlashCommandBuilder,
        descriptions: DescriptionMap<CommandStatus, O>,
        validator: (interaction: LimitedCommandInteraction) => Promise<S | OptionValidationErrorOutcome<T1>>,
        solver: (solverParams: S) => Promise<O>,
    ) {
        const describer = (outcome: O) => this.simpleDescriber(outcome, descriptions);
        super(interfacer, RendezvousSlashCommand.simpleReplyer, describer, validator, solver);
    }

    private simpleDescriber(outcome: O, descriptions: Map<CommandStatus, (o: O) => SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome>) {
        if (descriptions.has(outcome.status as CommandStatus)) return descriptions.get(outcome.status as CommandStatus)!(outcome);
        // Fallback to trying default descriptions
        const defaultOutcome = outcome as unknown as Outcome<string>;
        if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
            return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
        } else return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
    }
}