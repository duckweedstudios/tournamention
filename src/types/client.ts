import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { CustomCommand } from './customCommand.js';
import { RendezvousSlashCommand } from '../commands/slashcommands/architecture/rendezvousCommand.js';

// Type alias for RendezvousSlashCommand with unknown generic parameters.
type RdvsSlashCommandAlias = RendezvousSlashCommand<unknown, unknown, unknown>;

type SlashCommandCollectionPair = {
    name: string;
    command: CustomCommand | RdvsSlashCommandAlias;
}

export class TournamentionClient extends Client {
    private static instance: TournamentionClient;
    private commands: Collection<string, CustomCommand | RdvsSlashCommandAlias>;

    private constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
            ],
        });
        this.commands = new Collection();
        TournamentionClient.instance = this;
    }

    public addCommands(commands: SlashCommandCollectionPair[]): void {
        commands.forEach(com => {
            this.commands.set(com.name, com.command);
        });
    }

    public getCommands(): Collection<string, CustomCommand | RdvsSlashCommandAlias> {
        return this.commands;
    }

    public getCommand(name: string): CustomCommand | RdvsSlashCommandAlias | undefined {
        return this.commands.get(name);
    }

    public static async getInstance(): Promise<TournamentionClient> {
        if (!TournamentionClient.instance) {
            TournamentionClient.instance = new TournamentionClient();
        }
        return TournamentionClient.instance;
    }
}