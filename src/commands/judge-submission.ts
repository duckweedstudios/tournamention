import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';

const JudgeSubmissionCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('judge-submission')
        .setDescription('Approve or reject the submission for a challenge from a contestant.')
        .addStringOption(option => option.setName('name').setDescription('The name of the challenge.').setRequired(true))
        .addUserOption(option => option.setName('contestant').setDescription('The contestant who submitted the challenge.').setRequired(true))
        .addBooleanOption(option => option.setName('approve').setDescription('Approve the submission with True, reject it with False.').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the challenge is part of. Defaults to current tournament.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        interaction.reply({ content: 'This command is not yet implemented.', ephemeral: true });
    }
);

export default JudgeSubmissionCommand;