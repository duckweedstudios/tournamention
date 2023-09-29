import { OutcomeStatus, Outcome, SlashCommandDescribedOutcome, OutcomeWithMonoBody, OutcomeWithDuoBody } from './outcome.js';

export const defaultSlashCommandDescriptions = new Map<OutcomeStatus, (o: Outcome<string>) => SlashCommandDescribedOutcome>([
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [OutcomeStatus.SUCCESS, (_: Outcome<string>) => {
        return {
            userMessage: '✅ Success!',
            ephemeral: true,
        };
    }],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [OutcomeStatus.SUCCESS_MONO, (_: Outcome<string>) => {
        return {
            userMessage: `✅ Success! (default response, 1 data point omitted)`,
            ephemeral: true,
        };
    }],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [OutcomeStatus.SUCCESS_DUO, (_: Outcome<string>) => {
        return {
            userMessage: `✅ Success! (default response, 2 data points omitted)`,
            ephemeral: true,
        };
    }],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [OutcomeStatus.SUCCESS_NO_CHANGE, (_: Outcome<string>) => {
        return {
            userMessage: `✅ Success! However, certain operations made no changes.`,
            ephemeral: true,
        };
    }],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [OutcomeStatus.FAIL, (_: Outcome<string>) => {
        return {
            userMessage: '❌ This command failed.',
            ephemeral: true,
        };
    }],
    [OutcomeStatus.FAIL_VALIDATION, (o: Outcome<string>) => {
        return {
            userMessage: `❌ This command failed due to entered data ${(o as OutcomeWithMonoBody<string>).body.data}`,
            ephemeral: true,
        };
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [OutcomeStatus.FAIL_UNKNOWN, (_: Outcome<string>) => {
        return {
            userMessage: '❌ This command failed for an unknown reason.',
            ephemeral: true,
        };
    }],
]);