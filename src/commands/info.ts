import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';

const InfoCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('info')
        .setDescription('Display Tournamention bot information.'),
    async (interaction: CommandInteraction) => {
        interaction.reply('Hello world!');
    }
);

export default InfoCommand;