import { GuildSettingsDocument, TournamentDocument } from '../../types/customDocument.js';
import { GuildSettingsModel } from '../schemas/guildsettings.js';
// CREATE / POST
export const createGuildSettings = async (guildID: string): Promise<GuildSettingsDocument> => {
    return GuildSettingsModel.create({
        guildID: guildID,
    });
};

// READ / GET
export const getGuildSettings = async (guildID: string): Promise<GuildSettingsDocument | null> => {
    return GuildSettingsModel.findOne({ guildID: guildID }).exec();
};

export const getOrCreateGuildSettings = async (guildID: string): Promise<GuildSettingsDocument> => {
    const guildSettings = await getGuildSettings(guildID);
    return guildSettings ? guildSettings : createGuildSettings(guildID);
};

/**
 * Gets the current tournament of a guild, creating a GuildSettings document if one does not exist as a side-effect.
 * @param guildID The Discord Snowflake ID of the guild.
 * @returns A Promise that resolves to the current TournamentDocument of the guild, or null if one 
 * does not exist (e.g. there are no active Tournaments).
 */
export const getCurrentTournament = async (guildID: string): Promise<TournamentDocument | null> => {
    const serverSettings = await getOrCreateGuildSettings(guildID);
    return serverSettings.getCurrentTournament();
};

// UPDATE / PUT

// DELETE