import { Client, Collection } from 'discord.js';
import { CustomCommand } from './customCommand.js';

export type SlashCommandCollectionPair = {
    name: string;
    command: CustomCommand;
}

export class TournamentionClient extends Client {
    private static instance: TournamentionClient;
    private commands: Collection<string, CustomCommand>;

    private constructor() {
        super({
            intents: [],
        });
        this.commands = new Collection();
        TournamentionClient.instance = this;
    }

    public addCommands(commands: SlashCommandCollectionPair[]): void {
        commands.forEach(com => {
            this.commands.set(com.name, com.command);
        });
    }

    public getCommands(): Collection<string, CustomCommand> {
        return this.commands;
    }

    public getCommand(name: string): CustomCommand | undefined {
        return this.commands.get(name);
    }

    public static async getInstance(): Promise<TournamentionClient> {
        if (!TournamentionClient.instance) {
            TournamentionClient.instance = new TournamentionClient();
        }
        return TournamentionClient.instance;
    }
}