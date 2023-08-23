import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { UserFacingError } from '../types/customError.js';
import { getTournamentByName, updateTournament } from '../backend/queries/tournamentQueries.js';
import { CommandInteractionOptionResolverAlias } from '../types/discordTypeAlias.js';
import { TournamentDocument } from '../types/customDocument.js';

class EditTournamentError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'EditTournamentError';
    }
}

/**
 * Performs the entire editing process on a Tournament.
 * @param guildID `interaction.guildId`
 * @param options `interaction.options`
 * @returns The updated TournamentDocument, or null if the `updateTournament` call failed, which would only happen in a hypothetically possible race condition.
 * @throws `EditTournamentError` if the Tournament is not found by name.
 */
const editTournament = async (guildID: string, options: CommandInteractionOptionResolverAlias): Promise<TournamentDocument | null> => {
    const name = options.get('name', true).value as string;
    const newName = options.get('new-name', false)?.value as string ?? null;
    const photoURI = options.get('photo-uri', false)?.value as string ?? null;
    const visible = options.get('visible', false)?.value as boolean ?? null;
    const active = options.get('active', false)?.value as boolean ?? null;
    const statusDescription = options.get('status-description', false)?.value as string ?? null;
    const duration = options.get('duration', false)?.value as string ?? null;

    const tournament = await getTournamentByName(guildID, name);
    if (!tournament) throw new EditTournamentError(`Tournament ${name} not found in guild ${guildID}.`, `That tournament, **${name}**, was not found.`);
    return updateTournament(
        tournament._id, 
        // Conditionally add properties to the object. It would be almost equivalent to assign some but with the value undefined
        {
            ...(newName && { name: newName }),
            ...(photoURI && { photoURI: photoURI }),
            ...(active !== null && { active: active }),
            ...(visible !== null && { visibility: visible }),
            ...(statusDescription && { statusDescription: statusDescription }),
            ...(duration && { duration: duration }),
        }
    );
};

const EditTournamentCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('edit-tournament')
        .setDescription('Edit the details of a Tournament.')
        .addStringOption(option => option.setName('name').setDescription('The name of the tournament.').setRequired(true))
        .addStringOption(option => option.setName('new-name').setDescription('Rename the tournament to this.').setRequired(false))
        .addStringOption(option => option.setName('photo-uri').setDescription(`Change the linked image for the tournament's thumbnail.`).setRequired(false))
        .addBooleanOption(option => option.setName('visible').setDescription('Change whether the tournament can be seen by non-judges.').setRequired(false))
        .addBooleanOption(option => option.setName('active').setDescription('Change whether the tournament is accepting submissions now.').setRequired(false))
        .addStringOption(option => option.setName('status-description').setDescription('Change the explanation message for the tournament\'s current status.').setRequired(false))
        .addStringOption(option => option.setName('duration').setDescription('Change the message for when the tournament takes place.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check

        try {
            if (!(await editTournament(interaction.guildId!, interaction.options))) throw new Error(`editTournament returned null.`);
            interaction.reply({ content: `✅ Tournament updated!`, ephemeral: true });
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

export default EditTournamentCommand;