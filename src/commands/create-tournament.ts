import { MongoError } from 'mongodb';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { TournamentBuilder } from '../backend/queries/tournamentQueries.js';

const CreateTournamentCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('create-tournament')
        .setDescription('Create a new tournament from scratch.')
        .addStringOption(option => option.setName('name').setDescription('The name of the tournament').setRequired(true))
        .addStringOption(option => option.setName('photo-uri').setDescription(`A linked image for the tournament's thumbnail.`).setRequired(false))
        .addBooleanOption(option => option.setName('visible').setDescription('Whether the tournament can be seen by non-judges. Defaults true.').setRequired(false))
        .addBooleanOption(option => option.setName('active').setDescription('Whether the tournament is accepting submissions now. Defaults true.').setRequired(false))
        .addStringOption(option => option.setName('status-description').setDescription('An explanation of the tournament\'s current status.').setRequired(false))
        .addStringOption(option => option.setName('duration').setDescription('A simple description of when the tournament takes place.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        // TODO: Privileges check


        const name = interaction.options.get('name', true).value as string;
        const photoURI = interaction.options.get('photo-uri', false)?.value as string ?? 'https://imgur.com/MXLHd9R.png';
        const visible = interaction.options.get('visible', false)?.value as boolean ?? true;
        const active = interaction.options.get('active', false)?.value as boolean ?? true;
        const statusDescription = interaction.options.get('status-description', false)?.value as string ?? '';
        const duration = interaction.options.get('duration', false)?.value as string ?? '';

        const tournament = new TournamentBuilder()
            .setName(name)
            .setPhotoURI(photoURI)
            .setVisibility(visible)
            .setActive(active)
            .setStatusDescription(statusDescription)
            .setDuration(duration);
        try {
            await tournament.buildForGuild(interaction.guildId!);
            interaction.reply({ content: `✅ Tournament created!`, ephemeral: true });
        } catch (error) {
            if (error instanceof MongoError && error.code === 11000) {
                interaction.reply({ content: `❌ A tournament with that name already exists!`, ephemeral: true });
                return;
            }
            console.error(error);
            interaction.reply({ content: `❌ There was an error while creating the tournament!`, ephemeral: true });
        }
    }
);

export default CreateTournamentCommand;