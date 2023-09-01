import { ObjectId } from 'mongodb';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { DuplicateSubdocumentError, UserFacingError } from '../types/customError.js';
import { DifficultyDocument, TournamentDocument } from '../types/customDocument.js';
import { addDifficultyToTournament, getTournamentById, getTournamentByName, isSingleEmoji } from '../backend/queries/tournamentQueries.js';
import { Difficulty, DifficultyModel } from '../backend/schemas/difficulty.js';
import { CommandInteractionOptionResolverAlias } from '../types/discordTypeAlias.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';

class DifficultyCreationError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'DifficultyCreationError';
    }
}

class BatchDifficultyCreationError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'BatchDifficultyCreationError';
    }
}

class DifficultyFactory {
    constructor(private readonly tournamentID: ObjectId) {
        return;
    }

    /**
     * A batch creation method for Difficulty subdocuments. In case of duplicates in the batch or
     * existing Difficulties, the method will throw `BatchDifficultyCreationError` and no Difficulties
     * will be created.
     * @param difficulties An array of freshly-created DifficultyDocument objects to be added to the Tournament.
     * @returns An array of TournamentDocuments. Since order isn't guaranteed and since batch
     * creation fails or succeeds together, the return value isn't useful outside of `await`ing completion
     * completion in calling code.
     */
    public async createDifficulties(difficulties: DifficultyDocument[]): Promise<(TournamentDocument | null)[]> {
        const singular = difficulties.length === 1;
        const tournamentDocument = await getTournamentById(this.tournamentID);
        if (!tournamentDocument) throw new DifficultyCreationError(`Tournament with ID ${this.tournamentID} does not exist.`, `The difficult${singular ? 'y was' : 'ies were'} not added. The tournament does not exist.`);

        // Check for duplicate difficulty emojis both in the batch and in the existing challenges.
        difficulties.forEach(async (newDifficulty: Difficulty) => {
            if ((await tournamentDocument.get('resolvingDifficulties')).includes(newDifficulty))
                throw new BatchDifficultyCreationError(`Challenge ${newDifficulty.emoji} already exists in tournament ${tournamentDocument.name}.`,
                    `The difficult${singular ? 'y was' : 'ies were'} not added. A difficulty with the emoji ${newDifficulty.emoji} already exists in tournament **${tournamentDocument.name}**.`);
            if (difficulties.filter((d: Difficulty) => d.emoji === newDifficulty.emoji).length > 1)
                throw new BatchDifficultyCreationError(`Duplicate difficulty emojis ${newDifficulty.emoji} found in batch.`,
                    `The challenge${singular ? '' : 's'} were not added. Duplicate challenge names were found in the batch.`);
        });

        // No duplicates exist, so we are safe to add challenges in any order. 
        // Since our backend query methods are meant to mimic (simple) API endpoints, no batch
        // creation method exists (yet), so we must add each challenge individually.
        const promises = new Array<Promise<TournamentDocument | null>>();
        difficulties.forEach(async (difficulty: DifficultyDocument) => {
            promises.push(addDifficultyToTournament(tournamentDocument, difficulty));
        });
        return Promise.all(promises);
    }
}

/**
 * A class that handles the creation of Difficulty subdocuments within a Tournament. It serves as a
 * wrapper around `DifficultyFactory` to simplify the creation of a single Difficulty.
 * `DifficultyCreator`'s internals may resemble the Factory pattern at a glance, but this is merely
 * for readability. The class should not be used to create multiple Difficulties.
 */
class DifficultyCreator {
    private readonly tournamentName: string;
    private readonly emoji: string;
    private readonly pointValue: number;
    private currentTournament: Promise<TournamentDocument | null>;

    constructor(private readonly guildID: string, options: CommandInteractionOptionResolverAlias) {
        this.tournamentName = options.get('tournament', false)?.value as string ?? '';
        this.emoji = options.get('emoji', true).value as string;
        this.pointValue = options.get('point-value', true).value as number;
        this.currentTournament = getCurrentTournament(this.guildID);
    }

    async createDifficulty(): Promise<void> {
        // Use the specified tournament if provided. Otherwise attempt to use the current tournament, failing if there is none.
        let tournament: TournamentDocument | null;
        if (this.tournamentName) {
            // A tournament was specified -- use it
            tournament = await getTournamentByName(this.guildID, this.tournamentName);
            if (!tournament) throw new DifficultyCreationError(`Tournament ${this.tournamentName} not found in guild ${this.guildID}.`, `The difficulty was not created. That tournament, **${this.tournamentName}**, was not found.`);
        } else {
            // No tournament was specified...
            if (await this.currentTournament) {
                // ... and there is a current tournament -- use it
                tournament = await this.currentTournament;

            } else {
                // ... and there is no current tournament -- fail
                throw new DifficultyCreationError(`Guild ${this.guildID} has no current tournament.`, 'There is no current tournament. Make sure there is one, or specify your non-active tournament.');
            }
        }

        // Validate emoji input
        if (!isSingleEmoji(this.emoji))
            throw new DifficultyCreationError(`Provided emoji is invalid: ${this.emoji}`, `The difficulty was not created. The emoji you chose, ${this.emoji}, is not a single emoji.`);

        // Validate point value input
        // Input is already restricted to integers. Non-negative integers are valid (thus 0 is valid).
        if (this.pointValue < 0)
            throw new DifficultyCreationError(`Provided point value is invalid: ${this.pointValue}`, `The difficulty was not created. The point value you chose, ${this.pointValue}, must be 0 or greater.`);
        
        await new DifficultyFactory(tournament!._id).createDifficulties([await DifficultyModel.create({
            emoji: this.emoji,
            pointValue: this.pointValue,
        })]);
    }
}

const CreateDifficultyCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('create-difficulty')
        .setDescription('Create a difficulty rating for challenges within one tournament.')
        .addStringOption(option => option.setName('emoji').setDescription('An emoji identifying the difficulty.').setRequired(true))
        .addIntegerOption(option => option.setName('point-value').setDescription('The number of points earned by completing the challenge.').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the difficulty is part of. Defaults to current tournament.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check


        try {
            await new DifficultyCreator(interaction.guildId!, interaction.options).createDifficulty();
            interaction.reply({ content: `✅ Difficulty created!`, ephemeral: true });
        } catch (err) {
            if (err instanceof UserFacingError) {
                interaction.reply({ content: `❌ ${err.userMessage}`, ephemeral: true });
                return;
            } else if (err instanceof DuplicateSubdocumentError) { // TODO: refactor this logic to have a UserFacingError thrown that provides this message
                interaction.reply({ content: `❌ The difficulty was not created. A difficulty with that emoji already exists in the tournament.`, ephemeral: true });
                return;
            }
            console.error(`Error in create-difficulty.ts: ${err}`);
            interaction.reply({ content: `❌ There was an error while creating the difficulty!`, ephemeral: true });
            return;
        }
    }
);

export default CreateDifficultyCommand;