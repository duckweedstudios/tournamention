import { CommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface CustomCommand {
    data: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => void;
}