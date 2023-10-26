import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CommandInteractionOption, GuildMember, PermissionsBitField } from 'discord.js';
import { OutcomeStatus, Outcome, SlashCommandDescribedOutcome, OutcomeWithDuoListBody, OutcomeWithDuoBody, OutcomeWithMonoBody, OptionValidationErrorOutcome } from '../types/outcome.js';
import { getChallengeOfTournamentByName } from '../backend/queries/challengeQueries.js';
import { getContestantByGuildIdAndMemberId, getJudgeByGuildIdAndMemberId } from '../backend/queries/profileQueries.js';
import { createOrUpdateReviewNoteAndAddTo, getNewestSubmissionForChallengeFromContestant } from '../backend/queries/submissionQueries.js';
import { OptionValidationError, OptionValidationErrorStatus } from '../types/customError.js';
import { SubmissionStatus } from '../backend/schemas/submission.js';
import { LimitedCommandInteraction } from '../types/limitedCommandInteraction.js';
import { ValueOf } from '../types/typelogic.js';
import { Constraint, validateConstraints } from './slashcommands/architecture/validation.js';
import { getTournamentByName } from '../backend/queries/tournamentQueries.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';
import { defaultSlashCommandDescriptions } from '../types/defaultSlashCommandDescriptions.js';
import { RendezvousSlashCommand } from './slashcommands/architecture/rendezvousCommand.js';

/**
 * Alias for the first generic type of the command.
 */
type T1 = string;

/**
 * Alias for the second generic type of the command.
 */
type T2 = boolean;

/**
 * Status codes specific to this command.
 */
enum JudgeSubmissionSpecificStatus {
    SUCCESS_SUBMISSION_REVIEWED = 'SUCCESS_SUBMISSION_REVIEWED',
    SUCCESS_SUBMISSION_APPEALED = 'SUCCESS_SUBMISSION_APPEALED',
}

/**
 * Union of specific and generic status codes.
 */
type JudgeSubmissionStatus = JudgeSubmissionSpecificStatus | OutcomeStatus;

/**
 * The outcome format for the specific status code(s).
 */
type AssignJudgeSuccessSubmissionReviewedOutcome = {
    status: JudgeSubmissionSpecificStatus.SUCCESS_SUBMISSION_REVIEWED;
    body: {
        user: string;
        challengeName: string;
        approved: boolean;
    };
}

type AssignJudgeSuccessSubmissionAppealedOutcome = {
    status: JudgeSubmissionSpecificStatus.SUCCESS_SUBMISSION_APPEALED;
    body: {
        user: string;
        challengeName: string;
        previousApproved: boolean;
        approved: boolean;
    };
};

/**
 * Union of specific and generic outcomes.
 */
type JudgeSubmissionOutcome = AssignJudgeSuccessSubmissionReviewedOutcome | AssignJudgeSuccessSubmissionAppealedOutcome | Outcome<string, boolean>;

interface JudgeSubmissionSolverParams {
    guildId: string;
    challengeName: string;
    contestantId: string;
    judgeId: string;
    approve: boolean;
    notes?: string | undefined;
    tournamentName?: string | undefined;
}

/**
 * Judges the newest submission for a challenge from a contestant.
 * @param guildId The Discord guild ID.
 * @param challengeName The name of the challenge the submission is for.
 * @param contestantId The Discord member ID of the contestant.
 * @param judgeId The Discord member ID of the judge.
 * @param approve Whether to approve the submission (true) or reject it (false).
 * @param notes Optional notes to leave on the submission.
 * @param tournamentName The name of the Tournament the Challenge is part of. If provided, it should exist; otherwise, defaults to the current Tournament.
 * @returns 
 */
const judgeSubmissionSolver = async (params: JudgeSubmissionSolverParams): Promise<JudgeSubmissionOutcome> => {
    try {
        // Ensure the Tournament, Challenge, Contestant, active Judge, and newest Submission exist
        const tournament = params.tournamentName ? await getTournamentByName(params.guildId, params.tournamentName) : await getCurrentTournament(params.guildId);
        if (!tournament) return ({
            status: OutcomeStatus.FAIL_DNE_MONO,
            body: {
                data: params.tournamentName ? params.tournamentName : '(currentTournament)',
                context: 'tournament',
            },
        });
        const challenge = await getChallengeOfTournamentByName(params.challengeName, tournament);
        if (!challenge) return ({
            status: OutcomeStatus.FAIL_DNE_DUO,
            body: {
                data1: params.challengeName,
                context1: 'challenge',
                data2: tournament.name,
                context2: 'tournament',
            },
        });
        const contestant = await getContestantByGuildIdAndMemberId(params.guildId, params.contestantId);
        if (!contestant) return ({
            status: OutcomeStatus.FAIL_DNE_MONO,
            body: {
                data: params.contestantId,
                context: 'user',
            },
        });
        const submission = await getNewestSubmissionForChallengeFromContestant(challenge, contestant);
        if (!submission) return ({
            status: OutcomeStatus.FAIL_DNE_DUO,
            body: {
                data1: challenge.name,
                context1: 'challenge',
                data2: params.contestantId,
                context2: 'user',
            },
        });
        const judge = await getJudgeByGuildIdAndMemberId(params.guildId, params.judgeId);
        if (!judge) return ({
            status: OutcomeStatus.FAIL_DNE_MONO,
            body: {
                data: params.judgeId,
                context: 'judge',
            },
        });

        // Create a ReviewNote for the submission
        const result = (await createOrUpdateReviewNoteAndAddTo(submission, judge, params.approve ? SubmissionStatus.ACCEPTED : SubmissionStatus.REJECTED, params.notes))!;
        if (result.matchedCount === 1 && result.modifiedCount === 0) return ({
            // The submission was reviewed before and is already in the desired status
            status: OutcomeStatus.SUCCESS_NO_CHANGE,
            body: {
                data1: [params.contestantId, params.challengeName],
                context1: 'user, challenge',
                data2: [params.approve],
                context2: 'approved',
            },
        });
        if (result.matchedCount === 1 && result.modifiedCount === 1) return ({
            // The submission was reviewed before and was modified to the desired status
            status: JudgeSubmissionSpecificStatus.SUCCESS_SUBMISSION_APPEALED,
            body: {
                user: contestant.userID,
                challengeName: params.challengeName,
                previousApproved: !params.approve,
                approved: params.approve,
            },
        });
        if (result.matchedCount === 0 && result.upsertedCount === 1) return ({
            // The submission was not reviewed before and was created with the desired status
            status: JudgeSubmissionSpecificStatus.SUCCESS_SUBMISSION_REVIEWED,
            body: {
                user: contestant.userID,
                challengeName: params.challengeName,
                approved: params.approve,
            },
        });
    } catch (err) {
        // No expected thrown errors
    }

    return ({
        status: OutcomeStatus.FAIL_UNKNOWN,
        body: {},
    });
};

const judgeSubmissionSlashCommandValidator = async (interaction: LimitedCommandInteraction): Promise<JudgeSubmissionSolverParams | OptionValidationErrorOutcome<T1>> => {
    const guildId = interaction.guildId!;

    const metadataConstraints = new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([
        ['member', [
            // Ensure that the sender is a Judge or Administrator
            {
                category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                func: async function(metadata: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                    const judge = await getJudgeByGuildIdAndMemberId(guildId, (metadata as GuildMember).id);
                    return (judge && judge.isActiveJudge) || (metadata as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator);
                },
            },
        ]],
    ]);

    const contestant = interaction.options.get('contestant', true);
    const tournament = interaction.options.get('tournament', false);

    const optionConstraints = new Map<CommandInteractionOption | null, Constraint<ValueOf<CommandInteractionOption>>[]>([
        [tournament, [
            // Ensure that the tournament exists, if it was provided
            {
                category: OptionValidationErrorStatus.OPTION_DNE,
                func: async function(option: ValueOf<CommandInteractionOption>): Promise<boolean> {
                    const tournamentDocument = await getTournamentByName(guildId, option as string);
                    return tournamentDocument !== null;
                }
            },
        ]],
    ]);

    let challengeName: string;
    let approve: boolean;
    let notes: string;
    try {
        challengeName = interaction.options.get('name', true).value! as string;
        approve = interaction.options.get('approve', true).value! as boolean;
        const notesOption = interaction.options.get('notes', false);
        notes = (notesOption && typeof notesOption.value === 'string' ? notesOption.value : '');

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

    return {
        guildId: guildId,
        challengeName: challengeName,
        contestantId: contestant.user!.id,
        judgeId: interaction.member!.user!.id,
        approve: approve,
        notes: notes,
        tournamentName: (tournament ? tournament.value as string : undefined),
    };
};

const judgeSubmissionSlashCommandDescriptions = new Map<JudgeSubmissionStatus, (o: JudgeSubmissionOutcome) => SlashCommandDescribedOutcome>([
    [JudgeSubmissionSpecificStatus.SUCCESS_SUBMISSION_REVIEWED, (o: JudgeSubmissionOutcome) => {
        const oBody = (o as AssignJudgeSuccessSubmissionReviewedOutcome).body; 
        return {
            userMessage: `✅ <@${oBody.user}>'s submission for **${oBody.challengeName}** ${oBody.approved ? 'approved' : 'rejected'}!`, ephemeral: true
        };
    }],
    [JudgeSubmissionSpecificStatus.SUCCESS_SUBMISSION_APPEALED, (o: JudgeSubmissionOutcome) => {
        const oBody = (o as AssignJudgeSuccessSubmissionAppealedOutcome).body;
        return {
            userMessage: `✅ <@${oBody.user}>'s previously ${oBody.previousApproved ? 'approved' : 'rejected'} submission for **${oBody.challengeName}** has been ${oBody.approved ? 'approved' : 'rejected'}!`, ephemeral: true
        };
    }],
    [OutcomeStatus.SUCCESS_NO_CHANGE, (o: JudgeSubmissionOutcome) => {
        const oBody = (o as OutcomeWithDuoListBody<T1, T2>).body;
        return {
            userMessage: `✅ <@${oBody.data1[0]}>'s submission for ${oBody.data1[1]} was already ${oBody.data2[0] ? 'approved' : 'rejected'}.`, ephemeral: true
        };
    }],
    [OutcomeStatus.FAIL_DNE_DUO, (o: JudgeSubmissionOutcome) => {
        const oBody = (o as OutcomeWithDuoBody<T1>).body;
        if (oBody.context1 === 'challenge' && oBody.context2 === 'tournament') return ({
            userMessage: `❌ The challenge **${oBody.data1}** was not found in the tournament **${oBody.data2}**.`, ephemeral: true
        });
        else if (oBody.context1 === 'challenge' && oBody.context2 === 'user') return ({
            userMessage: `❌ <@${oBody.data2}> has not submitted a challenge for ${(o as OutcomeWithDuoBody<string>).body.data1}.`, ephemeral: true
        });
        else return ({
            userMessage: `❌ This command failed unexpectedly.`, ephemeral: true
        });
    }],
    [OutcomeStatus.FAIL_DNE_MONO, (o: JudgeSubmissionOutcome) => {
        const oBody = (o as OutcomeWithMonoBody<T1>).body;
        // Use context to describe what entity doesn't exist.
        if (oBody.context === 'user') return ({
            userMessage: `❌ This failed because <@${oBody.data}> might not be a contestant.`, ephemeral: true
        });
        else if (oBody.context === 'judge') return ({
            userMessage: `❌ You haven't been fully set up as a judge yet. Please have a server admin use \`/assign-judge \`<@${oBody.data}>.`, ephemeral: true
        });
        else if (oBody.context === 'challenge') return ({
            userMessage: `❌ The challenge **${oBody.data}** was not found.`, ephemeral: true
        });
        else if (oBody.context === 'tournament') return (
            oBody.data === '(currentTournament)' ? ({
                userMessage: `❌ The current tournament was not found.`, ephemeral: true
            }) : ({
                userMessage: `❌ The tournament **${oBody.data}** was not found.`, ephemeral: true
            })
        );
        else return ({
            userMessage: `❌ This command failed unexpectedly. **${oBody.data}** does not exist.`, ephemeral: true
        });
    }],
    [OutcomeStatus.FAIL_VALIDATION, (o: JudgeSubmissionOutcome) => {
        const oBody = (o as OptionValidationErrorOutcome<T1>).body;
        if (oBody.constraint.category === OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS) return ({
            userMessage: `❌ You are not a judge.`, ephemeral: true
        });
        else if (oBody.constraint.category === OptionValidationErrorStatus.OPTION_DNE) return ({
            userMessage: `❌ The tournament **${oBody.value}** was not found.`, ephemeral: true
        });
        else return ({
            userMessage: `❌ This command failed unexpectedly due to a validation error.`, ephemeral: true
        });
    }],
]);

const judgeSubmissionSlashCommandOutcomeDescriber = (outcome: JudgeSubmissionOutcome): SlashCommandDescribedOutcome => {
    if (judgeSubmissionSlashCommandDescriptions.has(outcome.status)) return judgeSubmissionSlashCommandDescriptions.get(outcome.status)!(outcome);
    // Fallback to trying default descriptions
    const defaultOutcome = outcome as Outcome<string>;
    if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
        return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
    } else return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
};

const judgeSubmissionSlashCommandReplyer = async (interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome): Promise<void> => {
    interaction.reply({ content: describedOutcome.userMessage, ephemeral: describedOutcome.ephemeral });
};

const JudgeSubmissionCommand = new RendezvousSlashCommand<JudgeSubmissionOutcome, JudgeSubmissionSolverParams, T1>(
    new SlashCommandBuilder()
        .setName('judge-submission')
        .setDescription('Approve or reject the newest submission for a challenge from a contestant.')
        .addStringOption(option => option.setName('name').setDescription('The name of the challenge.').setRequired(true))
        .addUserOption(option => option.setName('contestant').setDescription('The contestant who submitted the challenge.').setRequired(true))
        .addBooleanOption(option => option.setName('approve').setDescription('Approve the submission with True, reject it with False.').setRequired(true))
        .addStringOption(option => option.setName('notes').setDescription('Leave a review note or other comment on the submission.').setRequired(false))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the challenge is part of. Defaults to current tournament.').setRequired(false)) as SlashCommandBuilder,
    judgeSubmissionSlashCommandReplyer,
    judgeSubmissionSlashCommandOutcomeDescriber,
    judgeSubmissionSlashCommandValidator,
    judgeSubmissionSolver,
);

export default JudgeSubmissionCommand;