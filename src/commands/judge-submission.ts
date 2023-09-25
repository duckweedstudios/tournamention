import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { UserFacingError } from '../types/customError.js';

class JudgeSubmissionError extends UserFacingError {
    constructor(message: string, userMessage: string) {
        super(message, userMessage);
        this.name = 'JudgeSubmissionError';
    }
}

const judgeSubmission = async (interaction: CommandInteraction): Promise<void> => {
    
};

const JudgeSubmissionCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('judge-submission')
        .setDescription('Approve or reject the submission for a challenge from a contestant.')
        .addStringOption(option => option.setName('name').setDescription('The name of the challenge.').setRequired(true))
        .addUserOption(option => option.setName('contestant').setDescription('The contestant who submitted the challenge.').setRequired(true))
        .addBooleanOption(option => option.setName('approve').setDescription('Approve the submission with True, reject it with False.').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament the challenge is part of. Defaults to current tournament.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check


        try {
            await judgeSubmission(interaction);
            interaction.reply({ content: `✅ Submission judged!`, ephemeral: true });
        } catch (err) {
            if (err instanceof UserFacingError) {
                interaction.reply({ content: `❌ ${err.userMessage}`, ephemeral: true });
                return;
            }
            console.error(`Error in judge-submission.ts: ${err}`);
            interaction.reply({ content: `❌ There was an error while judging the submission!`, ephemeral: true });
            return;
        }
    }
);

export default JudgeSubmissionCommand;