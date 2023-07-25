import { BaseInteraction, ChatInputCommandInteraction } from 'discord.js';
import { TournamentionClient } from '../types/client.js';
import { CustomEvent } from '../types/customEvent.js';

const interactionCreate = new CustomEvent(
    'interactionCreate',
    async (interaction: BaseInteraction) => {
        if (!interaction.isCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;

        const tournamentionClient = await TournamentionClient.getInstance();

        if (interaction.isCommand()) {
            const command = tournamentionClient.getCommand((<ChatInputCommandInteraction> interaction).commandName);
            if (!command) {
                return;
            }
            try {
                command.execute(interaction);
            } catch (error) {
                console.error(error);
                interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } else if (interaction.isButton()) {
            // TODO: Adapt code from Condemned Souls bot...
            return;
        }
    }
);

export default interactionCreate;