import { ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';
import CustomButton from './architecture/CustomButton.js';
import { isEmbedDescribedOutcome } from '../types/outcome.js';
import { InteractionCacheServiceLocator } from '../types/interactionCacheServiceLocator.js';

const lastButton = new CustomButton(
    new ButtonBuilder()
        .setCustomId('last')
        .setLabel('Last ⏩')
        .setStyle(ButtonStyle.Primary),
    async (interaction: ButtonInteraction) => {
        // Find cached data for this original interaction
        const cached = InteractionCacheServiceLocator.getService().getCachedInteraction(interaction.message.interaction!.id);
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