import { ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';
import CustomButton from './architecture/CustomButton.js';
import { TournamentionClient } from '../types/client.js';
import { isEmbedDescribedOutcome } from '../types/outcome.js';
import { CachedChallengesInteraction } from '../types/cachedInteractions.js';

const lastButton = new CustomButton(
    new ButtonBuilder()
        .setCustomId('last')
        .setLabel('Last ⏩')
        .setStyle(ButtonStyle.Primary),
    async (interaction: ButtonInteraction) => {
        // Find cached data for this original interaction
        const client = await TournamentionClient.getInstance();
        const cached = client.getCachedInteraction(interaction.message.interaction!.id) as CachedChallengesInteraction;
        if (!cached) {
            await interaction.reply({ content: 'This interaction has expired!', ephemeral: true });
            return;
        }
        // Re-run the solver to get the new page
        const describedOutcome = await cached.solveAgainAndDescribe(cached.totalPages - 1);
        // Update the original interaction
        if (isEmbedDescribedOutcome(describedOutcome)) {
            interaction.update({ embeds: describedOutcome.embeds, components: describedOutcome.components });
        } else {
            interaction.update({ content: describedOutcome.userMessage });
        }
        // Update the cached interaction with the new page number
        cached.setPage(cached.totalPages - 1);
    }
);

export default lastButton;