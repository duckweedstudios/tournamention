import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CommandInteractionOption, GuildMember, PermissionsBitField, User } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { NonexistentJointGuildAndMemberError, OptionValidationError, OptionValidationErrorStatus, UnknownError } from '../types/customError.js';
import { setJudgeActive, setOrCreateActiveJudge } from '../backend/queries/profileQueries.js';
import { LimitedCommandInteraction, limitCommandInteraction } from '../types/limitedCommandInteraction.js';
import { Outcome, OutcomeStatus, OutcomeWithDuoBody, OutcomeWithDuoListBody, SlashCommandDescribedOutcome } from '../types/outcome.js';
import { defaultSlashCommandDescriptions } from '../types/defaultSlashCommandDescriptions.js';
import { ValueOf } from '../types/typelogic.js';
import { Constraint, validateConstraints } from './slashcommands/architecture/validation.js';

/**
 * Status codes specific to this command.
 */
enum AssignJudgeSpecificStatus {
    SUCCESS_JUDGE_UPDATED = 'SUCCESS_JUDGE_UPDATED',
    SUCCESS_JUDGE_CREATED = 'SUCCESS_JUDGE_CREATED',
}

/**
 * Union of specific and generic status codes.
 */
type AssignJudgeStatus = AssignJudgeSpecificStatus | OutcomeStatus;

/**
 * The outcome format for the specific status code(s).
 */
type AssignJudgeSuccessJudgeUpdatedOutcome = {
    status: AssignJudgeSpecificStatus.SUCCESS_JUDGE_UPDATED;
    body: {
        user: string;
        active: boolean;
    };
}

type AssignJudgeSuccessJudgeCreatedOutcome = {
    status: AssignJudgeSpecificStatus.SUCCESS_JUDGE_CREATED;
    body: {
        user: string;
    };
};

/**
 * Union of specific and generic outcomes.
 */
type AssignJudgeOutcome = AssignJudgeSuccessJudgeUpdatedOutcome | AssignJudgeSuccessJudgeCreatedOutcome | Outcome<string | boolean, string | boolean>;

/**
 * 
 * @param guildId The Discord guild ID.
 * @param memberId The Discord member ID.
 * @param revoke If `true`, sets the Judge to inactive. Otherwise, sets the Judge to active.
 * @returns 
 */
const assignJudge = async (guildId: string, memberId: string, revoke?: boolean): Promise<AssignJudgeOutcome> => {
    try {
        const result = await (revoke ? setJudgeActive(guildId, memberId, false) : setOrCreateActiveJudge(guildId, memberId));
        if (result.matchedCount === 1 && result.modifiedCount === 0) return ({
            // The Judge already exists and is already in the desired state
            status: OutcomeStatus.SUCCESS_NO_CHANGE,
            body: {
                data1: [memberId],
                context1: 'memberId',
                data2: [!revoke],
                context2: 'isActiveJudge',
            },
        });
        if (result.matchedCount === 1 && result.modifiedCount === 1) return ({
            // The Judge already exists and was modified to the desired state
            status: AssignJudgeSpecificStatus.SUCCESS_JUDGE_UPDATED,
            body: {
                user: memberId,
                active: revoke ? false : true,
            },
        });
        if (result.matchedCount === 0 && (result.upsertedCount === 1 || !revoke)) return ({
            // The Judge did not exist and was created with an active status, or they (ineffectually) tried to unrevoke a nonexistent Judge
            status: AssignJudgeSpecificStatus.SUCCESS_JUDGE_CREATED,
            body: {
                user: memberId,
            },
        });
        if (result.matchedCount === 0) {
            // The Judge did not exist and was not created -- i.e. they tried to revoke a nonexistent Judge
            throw new NonexistentJointGuildAndMemberError(guildId, memberId);
        } else throw new UnknownError(`Error in assign-judge.ts: Unexpected query result: ${result}.`);
    } catch (err) {
        if (err instanceof NonexistentJointGuildAndMemberError) return ({
            status: OutcomeStatus.FAIL_DNE_DUO,
            body: {
                data1: err.guildId,
                context1: 'guildId',
                data2: err.memberId,
                context2: 'memberId',
            }
        });
    }

    return {
        status: OutcomeStatus.FAIL_UNKNOWN,
        body: {},
    };
};

const assignJudgeSlashCommandValidator = async (interaction: LimitedCommandInteraction): Promise<AssignJudgeOutcome> => {
    let guildId: string;
    let targetId: string;
    let revoke: boolean;

    const who = interaction.options.get('who', true);

    const metadataConstraints = new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([
        ['member', [
            // Ensure that the sender is an Administrator
            {
                category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                func: async function(metadata: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                    return (metadata as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator);
                },
            },
        ]]
    ]);

    const optionConstraints = new Map<CommandInteractionOption, Constraint<ValueOf<CommandInteractionOption>>[]>([
        [who, [
            // Ensure that the target is not a bot
            {
                category: OptionValidationErrorStatus.TARGET_USER_BOT,
                func: async function(option: ValueOf<CommandInteractionOption>): Promise<boolean> {
                    return new Promise(function(resolve) {
                        resolve(!(option as User).bot);
                    });
                },
            },
        ]],
    ]);

    try {
        guildId = interaction.guildId!;
        targetId = who.user!.id;
        revoke = interaction.options.get('revoke', false)?.value as boolean;

        await validateConstraints(interaction, metadataConstraints, optionConstraints);
    } catch (err) {
        if (err instanceof OptionValidationError) return ({
            status: OutcomeStatus.FAIL_VALIDATION,
            body: {
                constraint: err.constraint,
                field: err.field,
                value: err.value,
                context: err.message,
            },
        });

        throw err;
    }

    return await assignJudge(guildId, targetId, revoke);
};

const assignJudgeSlashCommandDescriptions = new Map<AssignJudgeStatus, (o: AssignJudgeOutcome) => SlashCommandDescribedOutcome>([
    [AssignJudgeSpecificStatus.SUCCESS_JUDGE_UPDATED, (o: AssignJudgeOutcome) => ({
        userMessage: `✅ <@${(o as AssignJudgeSuccessJudgeUpdatedOutcome).body.user}> is ${(o as AssignJudgeSuccessJudgeUpdatedOutcome).body.active ? 'now an active judge!' : 'no longer an active judge.'}`, ephemeral: true   
    })],
    [AssignJudgeSpecificStatus.SUCCESS_JUDGE_CREATED, (o: AssignJudgeOutcome) => ({
        userMessage: `✅ <@${(o as AssignJudgeSuccessJudgeCreatedOutcome).body.user}> is now a new judge!`, ephemeral: true   
    })],
    [OutcomeStatus.SUCCESS_NO_CHANGE, (o: AssignJudgeOutcome) => ({
        userMessage: `✅ <@${(o as OutcomeWithDuoListBody<string, boolean>).body.data1[0]}> is already ${(o as OutcomeWithDuoListBody<string, boolean>).body.data2[0] ? '' : 'not '}a judge.`, ephemeral: true   
    })],
    [OutcomeStatus.FAIL_DNE_DUO, (o: AssignJudgeOutcome) => ({
        userMessage: `❌ <@${(o as OutcomeWithDuoBody<string>).body.data2}> is not a judge, so you cannot revoke them.`, ephemeral: true   
    })],
]);

const assignJudgeSlashCommandOutcomeDescriber = async (interaction: LimitedCommandInteraction): Promise<SlashCommandDescribedOutcome> => {
    const outcome = await assignJudgeSlashCommandValidator(interaction);
    if (assignJudgeSlashCommandDescriptions.has(outcome.status)) {
        return assignJudgeSlashCommandDescriptions.get(outcome.status)!(outcome);
    } 
    // Fallback to trying default descriptions
    const defaultOutcome = outcome as Outcome<string>;
    if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
        return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
    } else {
        return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
    }
};

const assignJudgeCommandReplyer = async (interaction: CommandInteraction): Promise<void> => {
    const describedOutcome = await assignJudgeSlashCommandOutcomeDescriber(limitCommandInteraction(interaction));
    interaction.reply({ content: describedOutcome.userMessage, ephemeral: describedOutcome.ephemeral });
};

const AssignJudgeSlashCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('assign-judge')
        .setDescription('Assign someone as a judge for challenge submissions in all tournaments, or revoke judge permissions.')
        .addUserOption(option => option.setName('who').setDescription('The new judge to assign, or whose permissions to modify.').setRequired(true))
        .addBooleanOption(option => option.setName('revoke').setDescription('To revoke an existing judge, use True. To re-assign a judge, use False or leave this blank.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        await assignJudgeCommandReplyer(interaction);
    }
);

export default AssignJudgeSlashCommand;