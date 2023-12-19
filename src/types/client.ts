import { Client, Collection, GatewayIntentBits, Snowflake } from 'discord.js';
import { RendezvousSlashCommand } from '../commands/architecture/rendezvousCommand.js';
import { OutcomeTypeConstraint } from './outcome.js';
import config from '../config.js';
import CustomButton from '../buttons/architecture/CustomButton.js';
import { CachedInteraction } from './cachedInteractions.js';

// Type alias for RendezvousSlashCommand with unknown generic parameters.
type RdvsSlashCommandAlias = RendezvousSlashCommand<OutcomeTypeConstraint, unknown, unknown>;

type SlashCommandCollectionPair = {
    name: string;
    command: RdvsSlashCommandAlias;
}

type ButtonCollectionPair = {
    customId: string;
    button: CustomButton;
}

export class TournamentionClient extends Client {
    private static instance: TournamentionClient;
    private commands: Collection<string, RdvsSlashCommandAlias>;
    private buttons: Collection<string, CustomButton>;
    private interactionCache: Collection<string, CachedInteraction>;

    private constructor() {
        const intents = [GatewayIntentBits.Guilds];
        if (!config.featureFlags.privacyMode) intents.push(GatewayIntentBits.MessageContent);
        super({
            intents,
        });
        this.commands = new Collection();
        this.buttons = new Collection();
        this.interactionCache = new Collection();
        TournamentionClient.instance = this;
    }

    public addCommands(commands: SlashCommandCollectionPair[]): void {
        commands.forEach(com => {
            this.commands.set(com.name, com.command);
        });
    }

    public getCommands(): Collection<string, RdvsSlashCommandAlias> {
        return this.commands;
    }

    public getCommand(name: string): RdvsSlashCommandAlias | undefined {
        return this.commands.get(name);
    }

    public addButtons(buttons: ButtonCollectionPair[]): void {
        buttons.forEach(btn => {
            this.buttons.set(btn.customId, btn.button);
        });
    }

    public getButton(customId: string): CustomButton | undefined {
        return this.buttons.get(customId);
    }

    public cacheInteraction(messageId: Snowflake, cachedInteraction: CachedInteraction): void {
        this.interactionCache.set(messageId, cachedInteraction);
        setTimeout(() => {
            this.interactionCache.delete(messageId);
        }, 14 * 60 * 1000);
        // TODO: Delete the interaction after < 15 minutes
    }

    public getCachedInteraction(messageId: Snowflake): CachedInteraction | undefined {
        return this.interactionCache.get(messageId);
    }

    public static async getInstance(): Promise<TournamentionClient> {
        if (!TournamentionClient.instance) {
            TournamentionClient.instance = new TournamentionClient();
        }
        return TournamentionClient.instance;
    }
}