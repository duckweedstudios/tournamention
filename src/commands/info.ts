import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';

export default class InfoCommand implements CustomCommand {
    data = new SlashCommandBuilder()
        .setName('info')
        .setDescription('Display Tournamention bot information');

    execute = async (interaction: CommandInteraction) => {
        interaction.reply(`${'Hello world!'}`);
    };
}