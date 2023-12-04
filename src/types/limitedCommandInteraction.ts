import { Snowflake, GuildMember, CommandInteraction, InteractionType, APIInteractionGuildMember, Message, MessageContextMenuCommandInteraction } from 'discord.js';
import { CommandInteractionOptionResolverAlias } from './discordTypeAlias.js';

export type LimitedCommandInteraction = {
    id: Snowflake;
    commandId: Snowflake;
    guildId: Snowflake | null;
    member: GuildMember | APIInteractionGuildMember | null;
    options: CommandInteractionOptionResolverAlias;
    type: InteractionType;
    targetMessage: Message | null;
};

export const limitCommandInteraction = (interaction: CommandInteraction): LimitedCommandInteraction => {
    const limitedCommandInteraction = {
        ...interaction,
        targetMessage: interaction.isContextMenuCommand() ? (interaction as MessageContextMenuCommandInteraction).targetMessage : null,
    };
    if (!limitedCommandInteraction.guildId || !limitedCommandInteraction.member) {
        console.error(`Error in limitedCommandInteraction.ts: ${interaction}`);
        throw new Error('Command interaction is missing guild ID or member. Only slash commands in guilds are supported.');
    }
    return limitedCommandInteraction;
};