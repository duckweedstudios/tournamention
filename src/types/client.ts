import { ChatInputApplicationCommandData, Client, Collection } from 'discord.js';

export type SlashCommandCollectionPair = {
    name: string;
    command: ChatInputApplicationCommandData;
}

export class TournamentionClient extends Client {
    private static instance: TournamentionClient;
    private commands: Collection<string, ChatInputApplicationCommandData>;

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

    public getCommands(): Collection<string, ChatInputApplicationCommandData> {
        return this.commands;
    }

    public getCommand(name: string): ChatInputApplicationCommandData | undefined {
        return this.commands.get(name);
    }

    public static async getInstance(): Promise<TournamentionClient> {
        if (!TournamentionClient.instance) {
            TournamentionClient.instance = new TournamentionClient();
        }
        return TournamentionClient.instance;
    }
}