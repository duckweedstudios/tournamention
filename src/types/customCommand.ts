import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export class CustomCommand {
    data: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => void;
    constructor(data: SlashCommandBuilder, execute: (interaction: CommandInteraction) => void) {
        this.data = data;
        this.execute = execute;
    }
}