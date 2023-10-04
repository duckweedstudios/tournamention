import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { getTournamentByName } from '../backend/queries/tournamentQueries.js';
import { SubmissionDocument, TournamentDocument } from '../types/customDocument.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';
import { getChallengeOfTournamentByName } from '../backend/queries/challengeQueries.js';
import { UserFacingError } from '../types/customError.js';
import { getOrCreateContestant } from '../backend/queries/profileQueries.js';
import { createSubmission, getSubmissionsForChallengeFromContestant } from '../backend/queries/submissionQueries.js';
import { SubmissionStatus } from '../backend/schemas/submission.js';

class ChallengeSubmissionError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'ChallengeSubmissionError';
    }
}

const submitChallenge = async (interaction: CommandInteraction): Promise<void> => {
    // Use the specified tournament if provided. Otherwise attempt to use the current tournament, failing if there is none.
    const tournamentName = interaction.options.get('tournament', false)?.value as string ?? '';
    let tournament: TournamentDocument | null;
    if (tournamentName) {
        // A tournament was specified -- use it
        tournament = await getTournamentByName(interaction.guildId!, tournamentName);
        if (!tournament) throw new ChallengeSubmissionError(`Tournament ${tournamentName} not found in guild ${interaction.guildId}.`, `Your submission was not sent. That tournament, **${tournamentName}**, was not found.`);
    } else {
        // No tournament was specified...
        const currentTournament = await getCurrentTournament(interaction.guildId!);
        if (currentTournament) {
            // ... and there is a current tournament -- use it...
            tournament = currentTournament;
            // ...unless it is hidden!
            if (!tournament.visibility) throw new ChallengeSubmissionError(`Tournament ${tournament.name} is hidden.`, `Your submission was not sent. The current tournament is currently hidden and is not accepting submissions.`);
        } else {
            // ... and there is no current tournament -- fail
            throw new ChallengeSubmissionError(`Guild ${interaction.guildId} has no current tournament.`, 'Your submission was not sent. There is no current tournament.');
        }
    }
    const challengeName = interaction.options.get('name', true).value as string;
    const challenge = await getChallengeOfTournamentByName(challengeName, tournament);
    if (!challenge) throw new ChallengeSubmissionError(`Challenge ${challengeName} not found in tournament ${tournament.name}.`, `Your submission was not sent. That challenge, **${challengeName}**, was not found in the tournament **${tournament.name}**.`);

    // Fail if the tournament or challenge is not active
    if (!tournament.active) throw new ChallengeSubmissionError(`Tournament ${tournament.name} is not active.`, `Your submission was not sent. That tournament, **${tournament.name}**, is not accepting submissions.`);
    if (!challenge.visibility) {
        throw new ChallengeSubmissionError(`Challenge ${challenge.name} is not active.`, `Your submission was not sent. That challenge is currently hidden and is not accepting submissions.`);
    }

    // Check contestant status -- for now, just getOrCreate them... TODO
    const contestant = await getOrCreateContestant(interaction.guildId!, interaction.user.id);

    // Fail if no proof was provided
    const proofLink = interaction.options.get('proof-link', true).value as string;
    if (!proofLink) {
        throw new ChallengeSubmissionError(`No proof was provided.`, `Your submission was not sent. You must provide one form proof of your completion of the challenge.`);
    }

    // Fail if contestant already has pending or accepted submission for this challenge
    const submissions = await getSubmissionsForChallengeFromContestant(challenge, contestant);
    if (submissions) {
        // Using for ... of syntax since filter does not support async functions
        // (Promise<false> is truthy because any Promise is truthy)
        const nonRejectedSubmissions = new Array<SubmissionDocument>();
        for (const submission of submissions) {
            if (await submission.get('status') !== SubmissionStatus.REJECTED) {
                nonRejectedSubmissions.push(submission);
            }
        }
        if (nonRejectedSubmissions.length > 0) {
            throw new ChallengeSubmissionError(`Submission rejected due to pending or already accepted submission from this member.`, `Your submission was not sent. Your previous submission to this challenge is either waiting to be approved or was already approved.`);
        }
    }

    try {
        await createSubmission(challenge, contestant, proofLink);
    } catch (err) {
        if (err instanceof UserFacingError) {
            throw new ChallengeSubmissionError(`Error in submit-challenge.ts: ${err.message}`, err.userMessage);
        }
        throw err;
    }
};

const SubmitChallengeCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('submit-challenge')
        .setDescription('Send your submission for a challenge you completed, along with proof.')
        .addStringOption(option => option.setName('name').setDescription('The name of the challenge.').setRequired(true))
        .addStringOption(option => option.setName('proof-link').setDescription('Your proof of completing the challenge. Linkless? Send it on this server then Copy Message Link!').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the challenge is part of. Defaults to current tournament.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check


        try {
            await submitChallenge(interaction);
            interaction.reply({ content: `✅ Submission sent for review!`, ephemeral: true });
        } catch (err) {
            if (err instanceof UserFacingError) {
                interaction.reply({ content: `❌ ${err.userMessage}`, ephemeral: true });
                return;
            }
            console.error(`Error in submit-challenge.ts: ${err}`);
            interaction.reply({ content: `❌ There was an error while sending your submission!`, ephemeral: true });
            return;
        }
    }
);

export default SubmitChallengeCommand;