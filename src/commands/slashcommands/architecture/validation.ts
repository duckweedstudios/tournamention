import { LimitedCommandInteraction } from '../../../types/limitedCommandInteraction.js';
import { ValueOf } from '../../../types/typelogic.js';
import { OptionValidationError, OptionValidationErrorStatus } from '../../../types/customError.js';
import { ApplicationCommandOptionType, CommandInteractionOption } from 'discord.js';

export type Constraint<T> = {
    category: OptionValidationErrorStatus;
    func: (val: T) => Promise<boolean>;
}
/**
 * Runs every constraint provided on the metadata fields and options of the (slash command) interaction, throwing an `OptionValidationError` on the first failure.
 * @param interaction The `LimitedCommandInteraction` form of a slash command `CommandInteraction`.
 * @param metadataConstraintMap A map of a metadata field of `LimitedCommandInteraction` to a list of one or many `Constraint`s to run on that field.
 * @param optionConstraintMap A map of options of the slash command to a list of one or many `Constraint`s to run on that option.
 */
export const validateConstraints = (interaction: LimitedCommandInteraction, metadataConstraintMap: Map<keyof LimitedCommandInteraction, [Constraint<ValueOf<LimitedCommandInteraction>>]>, optionConstraintMap: Map<CommandInteractionOption | null, [Constraint<ValueOf<CommandInteractionOption>>]>): void => {
    metadataConstraintMap.forEach((constraints, metadataField) => {
        constraints.forEach((constraint) => {
            if (!constraint.func(interaction[metadataField])) {
                throw new OptionValidationError<ValueOf<LimitedCommandInteraction>>(`Validation failed: check ${constraint.category} on metadata field ${metadataField} failed for value ${interaction[metadataField]}.`,
                    constraint,
                    metadataField,
                    interaction[metadataField]);
            }
        });
    });

    optionConstraintMap.forEach((constraints, option) => {
        // If the option wasn't provided, don't attempt to validate it.
        if (!option) return;

        // Determine the intended option data based on `option.type`.
        let optionValue: ValueOf<CommandInteractionOption>;
        if (option.type === ApplicationCommandOptionType.User) {
            optionValue = option.user;
        } else if (option.type === ApplicationCommandOptionType.Channel) {
            optionValue = option.channel;
        } else if (option.type === ApplicationCommandOptionType.Role) {
            optionValue = option.role;
        } else if (option.type === ApplicationCommandOptionType.String || option.type === ApplicationCommandOptionType.Integer || option.type === ApplicationCommandOptionType.Number || option.type === ApplicationCommandOptionType.Boolean) {
            optionValue = option.value;
        } else {
            throw new Error(`Error in validation.ts: option ${option.name} does not match a supported option type.`);
        }

        // With the type of the option established, run the constraints on it.
        constraints.forEach((constraint) => {
            if (!constraint.func(optionValue)) {
                throw new OptionValidationError(`Validation failed: check ${constraint.category} on metadata field ${option.name} failed for value ${optionValue}.`,
                    constraint,
                    option.name,
                    optionValue);
            }
        });
    });
};