import { GuildSettingsModel } from '../schemas/guildsettings.js';
// CREATE / POST

// READ / GET
export const getGuildSettings = async (guildID: string) => {
    return GuildSettingsModel.findOne({ guildID: guildID });
};

// UPDATE / PUT

// DELETE