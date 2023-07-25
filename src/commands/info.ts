import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';

const InfoCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('info')
        .setDescription('Display Tournamention bot information.')
        .addStringOption(option => option.setName('info').setDescription('The information to display.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        console.log('Hello world!');
        interaction.reply({ content: `Hello world! ${interaction.options.get('info')?.value}`, ephemeral: true });
    }
);

export default InfoCommand;