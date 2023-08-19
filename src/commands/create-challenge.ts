import { ObjectId } from 'mongodb';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { addChallengeToTournament, getDifficultyByEmoji, getTournamentById, getTournamentByName } from '../backend/queries/tournamentQueries.js';
import { ChallengeDocument, DifficultyDocument, TournamentDocument } from '../types/customDocument.js';
import { Challenge, ChallengeModel } from '../backend/schemas/challenge.js';
import { DuplicateSubdocumentError, UserFacingError } from '../types/customError.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';
import { CommandInteractionOptionResolverAlias } from '../types/discordTypeAlias.js';

class ChallengeCreationError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'ChallengeCreationError';
    }
}

class BatchChallengeCreationError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'BatchChallengeCreationError';
    }
}

/**
 * Handles batch creation of one or many Challenge subdocuments within a Tournament. The Factory is
 * tied to the Tournament (provided by its `ObjectId`) supplied at construction time.
 */
class ChallengeFactory {    
    constructor(private readonly tournamentID: ObjectId) {
        return;
    }

    /**
     * A batch creation method for Challenge subdocuments. In case of duplicates in the batch or
     * existing Challenges, the method will throw `BatchChallengeCreationError` and no Challenges
     * will be created.
     * @param challenges An array of freshly-created ChallengeDocument objects to be added to the Tournament.
     * @returns An array of TournamentDocuments. Since order isn't guaranteed and since batch
     * creation fails or succeeds together, the return value isn't useful outside of `await`ing completion
     * completion in calling code.
     */
    public async createChallenges(challenges: ChallengeDocument[]): Promise<(TournamentDocument | null)[]> {
        const singular = challenges.length === 1;
        const tournamentDocument = await getTournamentById(this.tournamentID);
        if (!tournamentDocument) throw new ChallengeCreationError(`Tournament with ID ${this.tournamentID} does not exist.`, `The challenge${singular ? ' was' : 's were'} not added. The tournament does not exist.`);

        // Check for duplicate challenge names both in the batch and in the existing challenges.
        challenges.forEach((newChallenge: Challenge) => {
            if (tournamentDocument.challenges.includes(newChallenge))
                throw new BatchChallengeCreationError(`Challenge ${newChallenge.name} already exists in tournament ${tournamentDocument.name}.`,
                    `The challenge${singular ? ' was' : 's were'} not added. A challenge with the name ${newChallenge.name} already exists in tournament **${tournamentDocument.name}**.`);
            if (challenges.filter((c: Challenge) => c.name === newChallenge.name).length > 1)
                throw new BatchChallengeCreationError(`Duplicate challenge names ${newChallenge.name} found in batch.`,
                    `The challenge${singular ? '' : 's'} were not added. Duplicate challenge names were found in the batch.`);
        });

        // No duplicates exist, so we are safe to add challenges in any order. 
        // Since our backend query methods are meant to mimic (simple) API endpoints, no batch
        // creation method exists (yet), so we must add each challenge individually.
        const promises = new Array<Promise<TournamentDocument | null>>();
        challenges.forEach(async (challenge: ChallengeDocument) => {
            promises.push(addChallengeToTournament(tournamentDocument, challenge));
        });
        return Promise.all(promises);
    }
}

/**
 * A class that handles the creation of Challenge subdocuments within a Tournament. It serves as a
 * wrapper around `ChallengeFactory` to simplify the creation of a single Challenge.
 * `ChallengeCreator`'s internals may resemble the Factory pattern at a glance, but this is merely
 * for readability. The class should not be used to create multiple Challenges.
 */
class ChallengeCreator {
    private readonly tournamentName: string;
    private readonly name: string;
    private readonly description: string;
    private readonly game: string;
    private readonly difficulty: string;
    private readonly visible: boolean;
    private currentTournament: Promise<TournamentDocument | null>;

    constructor(private readonly guildID: string, options: CommandInteractionOptionResolverAlias) {
        this.tournamentName = options.get('tournament', false)?.value as string ?? '';
        this.name = options.get('name', true).value as string;
        this.description = options.get('description', true).value as string;
        this.game = options.get('game', true).value as string;
        this.difficulty = options.get('difficulty', false)?.value as string ?? '';
        this.visible = options.get('visible', false)?.value as boolean ?? true;
        this.currentTournament = getCurrentTournament(this.guildID);
    }

    async createChallenge(): Promise<void> {
        // Use the specified tournament if provided. Otherwise attempt to use the current tournament, failing if there is none.
        let tournament: TournamentDocument | null;
        if (this.tournamentName) {
            // A tournament was specified -- use it
            tournament = await getTournamentByName(this.guildID, this.tournamentName);
            if (!tournament) throw new ChallengeCreationError(`Tournament ${this.tournamentName} not found in guild ${this.guildID}.`, `That tournament, **${this.tournamentName}**, was not found.`);
        } else {
            // No tournament was specified...
            if (await this.currentTournament) {
                // ... and there is a current tournament -- use it
                tournament = await this.currentTournament;

            } else {
                // ... and there is no current tournament -- fail
                throw new ChallengeCreationError(`Guild ${this.guildID} has no current tournament.`, 'There is no current tournament. Make sure there is one, or specify your non-active tournament.');
            }
        }

        // Validate the difficulty, if provided
        let difficultyDocument: DifficultyDocument | null = null;
        if (this.difficulty) {
            difficultyDocument = await getDifficultyByEmoji(tournament!, this.difficulty);
            if (!difficultyDocument) throw new ChallengeCreationError(`Difficulty ${this.difficulty} not found in tournament ${this.tournamentName}`, `The challenge was not created. The difficulty you chose, ${this.difficulty}, does not exist in the tournament **${tournament!.name}**. Remember that difficulties are identified by single emojis.`);
        }
        
        await new ChallengeFactory(tournament!._id).createChallenges([await ChallengeModel.create({
            name: this.name,
            description: this.description,
            game: this.game,
            difficulty: (difficultyDocument ? difficultyDocument._id : difficultyDocument),
            visibility: this.visible,
        })]);
    }
}

const CreateChallengeCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('create-challenge')
        .setDescription('Create a challenge.')
        .addStringOption(option => option.setName('name').setDescription(`A short name for the challenge.`).setRequired(true))
        .addStringOption(option => option.setName('game').setDescription('The name of the game, or something else like "IRL".').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('The complete description of the challenge, restrictions, and rules.').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the challenge is part of. Defaults to current tournament.').setRequired(false))
        .addStringOption(option => option.setName('difficulty').setDescription('The emoji representing the challenge level. Defaults to default difficulty.').setRequired(false))
        .addBooleanOption(option => option.setName('visible').setDescription('Whether the challenge is visible to contestants. Defaults true.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check


        try {
            await new ChallengeCreator(interaction.guildId!, interaction.options).createChallenge();
            interaction.reply({ content: `✅ Challenge created!`, ephemeral: true });
        } catch (err) {
            if (err instanceof UserFacingError) {
                interaction.reply({ content: `❌ ${err.userMessage}`, ephemeral: true });
                return;
            } else if (err instanceof DuplicateSubdocumentError) { // TODO: refactor this logic to have a UserFacingError thrown that provides this message
                interaction.reply({ content: `❌ The challenge was not created. A challenge with that name already exists in the tournament.`, ephemeral: true });
                return;
            }
            console.error(`Error in create-challenge.ts: ${err}`);
            interaction.reply({ content: `❌ There was an error while creating the challenge!`, ephemeral: true });
            return;
        }
    }
);

export default CreateChallengeCommand;