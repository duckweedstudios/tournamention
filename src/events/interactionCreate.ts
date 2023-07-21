import { BaseInteraction, ChatInputCommandInteraction } from 'discord.js';
import { TournamentionClient } from 'src/types/client';

export const name = 'interactionCreate';
export const execute = async (interaction: BaseInteraction) => {
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
        // const button = interaction.client.buttons.get(interaction.customId);
        // if (!button) {
        //     return;
        // }
        // try {
        //     button.execute(interaction);
        // } catch (error) {
        //     console.error(error);
        //     interaction.reply({ content: 'There was an error while pressing this button!', ephemeral: true });
        // }
        return;
    }
};