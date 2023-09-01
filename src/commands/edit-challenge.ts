import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { UserFacingError } from '../types/customError.js';
import { getTournamentByName } from '../backend/queries/tournamentQueries.js';
import { CommandInteractionOptionResolverAlias } from '../types/discordTypeAlias.js';
import { ChallengeDocument, TournamentDocument } from '../types/customDocument.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';
import { updateChallengeById } from '../backend/queries/challengeQueries.js';
import { Difficulty } from '../backend/schemas/difficulty.js';

class EditChallengeError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'EditTournamentError';
    }
}

/**
 * Performs the entire editing process on a Challenge.
 * @param guildID `interaction.guildId`
 * @param options `interaction.options`
 * @returns The updated ChallengeDocument, or null if the `updateChallenge` call failed, which would only happen in a hypothetically possible race condition.
 * @throws `EditChallengeError` if the Tournament is not found by name.
 */
const editChallenge = async (guildID: string, options: CommandInteractionOptionResolverAlias): Promise<ChallengeDocument | null> => {
    const name = options.get('name', true).value as string;
    const tournamentName = options.get('tournament', false)?.value as string ?? null;
    const newName = options.get('new-name', false)?.value as string ?? null;
    const description = options.get('description', false)?.value as string ?? null;
    const difficulty = options.get('difficulty', false)?.value as string ?? null;
    const game = options.get('game', false)?.value as string ?? null;
    const visible = options.get('visible', false)?.value as boolean ?? null;

    // Resolve desired tournament
    let tournament: TournamentDocument | null;
    if (tournamentName)  {
        // A tournament was specified -- use it
        tournament = await getTournamentByName(guildID, tournamentName);
        if (!tournament) throw new EditChallengeError(`Tournament ${tournamentName} not found in guild ${guildID}.`, `That tournament, **${tournamentName}**, was not found.`);
    } else {
        // No tournament was specified...
        const currentTournament = await getCurrentTournament(guildID);
        if (currentTournament) {
            // ... and there is a current tournament -- use it
            tournament = currentTournament;
        } else {
            // ... and there is no current tournament -- fail
            throw new EditChallengeError(`Guild ${guildID} has no current tournament.`, 'There is no current tournament. Make sure there is one, or specify your non-active tournament.');
        }
    }

    // Resolve desired challenge
    const challenge = tournament.challenges.find(challenge => challenge.name === name);
    if (!challenge) throw new EditChallengeError(`Challenge ${name} not found in tournament ${tournamentName}.`, `That challenge, **${name}**, was not found in the tournament **${tournamentName}**.`);

    // Resolve desired difficulty
    let difficultyObject: Difficulty | undefined;
    if (difficulty) {
        difficultyObject = await tournament.difficulties.find(difficultyDocument => difficultyDocument.emoji === difficulty);
        if (!difficultyObject) throw new EditChallengeError(`Difficulty ${difficulty} not found in tournament ${tournamentName}`, `The challenge was not edited. The difficulty you chose, ${difficulty}, does not exist in the tournament **${tournamentName}**. Remember that difficulties are identified by single emojis.`);
    }
    console.log(`${difficulty} ${difficultyObject} ${challenge._id}`);

    return updateChallengeById(
        challenge._id,
        {
            ...(newName && { name: newName }),
            ...(description && { description: description }),
            ...((difficulty && difficultyObject) && { difficulty: difficultyObject._id }),
            ...(game && { game: game }),
            ...(visible !== null && { visibility: visible }),
        }
    );
};

const EditChallengeCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('edit-challenge')
        .setDescription('Edit the details of a Challenge.')
        .addStringOption(option => option.setName('name').setDescription('The name of the challenge.').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the challenge is in. Defaults to current tournament.').setRequired(false))
        .addStringOption(option => option.setName('new-name').setDescription('Rename the challenge to this.').setRequired(false))
        .addStringOption(option => option.setName('description').setDescription('Change the description of the challenge, including restrictions or rules.').setRequired(false))
        .addStringOption(option => option.setName('difficulty').setDescription(`Change the challenge's difficulty, using the emoji of a difficulty that exists in the tournament.`).setRequired(false))
        .addStringOption(option => option.setName('game').setDescription('Change the game this challenge is for, or something else like "IRL".').setRequired(false))
        .addBooleanOption(option => option.setName('visible').setDescription('Change whether the tournament can be seen by non-judges.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check

        try {
            if (!(await editChallenge(interaction.guildId!, interaction.options))) throw new Error(`editChallenge returned null.`);
            interaction.reply({ content: `✅ Challenge updated!`, ephemeral: true });
        } catch (err) {
            if (err instanceof UserFacingError) {
                interaction.reply({ content: `❌ ${err.userMessage}`, ephemeral: true });
                return;
            }
            console.error(`Error in edit-tournament.ts: ${err}`);
            interaction.reply({ content: `❌ There was an error while updating the tournament!`, ephemeral: true });
        }
    }
);

export default EditChallengeCommand;