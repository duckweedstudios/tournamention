import { OptionValidationErrorStatus } from './customError.js';
import { OutcomeStatus, Outcome, SlashCommandDescribedOutcome, OutcomeWithMonoBody, OutcomeWithDuoBody, OptionValidationErrorOutcome } from './outcome.js';

export const defaultSlashCommandDescriptions = new Map<OutcomeStatus, (o: Outcome<string>) => SlashCommandDescribedOutcome>([
    [OutcomeStatus.SUCCESS, (_: Outcome<string>) => {
        return {
            userMessage: '✅ Success!',
            ephemeral: true,
        };
    }],
    [OutcomeStatus.SUCCESS_MONO, (_: Outcome<string>) => {
        return {
            userMessage: `✅ Success! (default response, 1 data point omitted)`,
            ephemeral: true,
        };
    }],
    [OutcomeStatus.SUCCESS_DUO, (_: Outcome<string>) => {
        return {
            userMessage: `✅ Success! (default response, 2 data points omitted)`,
            ephemeral: true,
        };
    }],
    [OutcomeStatus.SUCCESS_NO_CHANGE, (_: Outcome<string>) => {
        return {
            userMessage: `✅ Success! However, certain operations made no changes.`,
            ephemeral: true,
        };
    }],
    [OutcomeStatus.FAIL, (_: Outcome<string>) => {
        return {
            userMessage: '❌ This command failed.',
            ephemeral: true,
        };
    }],
    [OutcomeStatus.FAIL_VALIDATION, (o: Outcome<string>) => {
        const oBody = (o as OptionValidationErrorOutcome<string>).body;
        if (oBody.constraint.category === OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS) return ({
            userMessage: `❌ You do not have permission to use this command.`, ephemeral: true,
        });
        else if (oBody.constraint.category === OptionValidationErrorStatus.TARGET_USER_BOT) return ({
            userMessage: `❌ ${oBody.value} is a bot, so you cannot use this command on them.`, ephemeral: true,
        });
        else if (oBody.constraint.category === OptionValidationErrorStatus.NUMBER_BEYOND_RANGE) return ({
            userMessage: `❌ The number you provided for **${oBody.field}**, *${oBody.value}*, is outside the required range.`, ephemeral: true,
        });
        else if (oBody.constraint.category === OptionValidationErrorStatus.OPTION_DNE) return ({
            userMessage: `❌ The value you provided for **${oBody.field}**, *${oBody.value}*, was not found.`, ephemeral: true,
        });
        else return ({
            userMessage: `❌ This command failed due to a validation error.`, ephemeral: true,
        });
    }],
    [OutcomeStatus.FAIL_DNE_MONO, (o: Outcome<string>) => {
        return {
            userMessage: `❌ This command failed because the data ${(o as OutcomeWithMonoBody<string>).body.data} could not be found.`,
            ephemeral: true,
        };
    }],
    [OutcomeStatus.FAIL_DNE_DUO, (o: Outcome<string>) => {
        return {
            userMessage: `❌ This command failed because ${(o as OutcomeWithDuoBody<string>).body.data1} and ${(o as OutcomeWithDuoBody<string>).body.data2} do not exist together.`,
            ephemeral: true,
        };
    }],
    [OutcomeStatus.FAIL_UNKNOWN, (_: Outcome<string>) => {
        return {
            userMessage: '❌ This command failed for an unknown reason.',
            ephemeral: true,
        };
    }],
]);