import { Snowflake, CommandInteraction, InteractionType, Message, MessageContextMenuCommandInteraction, PermissionsBitField, ApplicationCommandOptionType } from 'discord.js';

export type LimitedUser = {
    id: Snowflake;
};

export type LimitedChannel = {
    id: Snowflake;
};

export type LimitedRole = {
    id: Snowflake;
};

export type LimitedGuildMember = {
    id: Snowflake;
    permissions: Readonly<PermissionsBitField>;
    user: LimitedUser;
};

export type LimitedCommandInteractionOption = {
    name: string;
    type: ApplicationCommandOptionType;
    value?: string | number | boolean;
    user?: LimitedUser;
    channel?: LimitedChannel | null;
    role?: LimitedRole | null;
};

export type LimitedCommandInteraction = {
    id: Snowflake;
    commandId: Snowflake;
    guildId: Snowflake | null;
    member: LimitedGuildMember,
    options: {
        get(name: string, required: true): LimitedCommandInteractionOption,
        get(name: string, required?: boolean): LimitedCommandInteractionOption | null;
    };
    type: InteractionType;
    targetMessage: Message | null;
};

export const limitCommandInteraction = (interaction: CommandInteraction): LimitedCommandInteraction => {
    const limitedCommandInteraction = {
        ...interaction,
        member: <LimitedGuildMember> interaction.member,
        targetMessage: interaction.isContextMenuCommand() ? (interaction as MessageContextMenuCommandInteraction).targetMessage : null,
    };
    if (!limitedCommandInteraction.guildId || !limitedCommandInteraction.member) {
        console.error(`Error in limitedCommandInteraction.ts: ${interaction}`);
        throw new Error('Command interaction is missing guild ID or member. Only slash commands in guilds are supported.');
    }
    return limitedCommandInteraction;
};