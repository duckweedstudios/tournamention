import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class CustomCommand {
    data: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => void;
    constructor(data: SlashCommandBuilder, execute: (interaction: CommandInteraction) => void) {
        this.data = data;
        this.execute = execute;
    }
}

export const isCustomCommand = (object: unknown): object is CustomCommand => {
    return (object as CustomCommand).data !== undefined && (object as CustomCommand).execute !== undefined;
};