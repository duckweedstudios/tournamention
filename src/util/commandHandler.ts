import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { TournamentionClient } from 'src/types/client';
import { CustomCommand } from 'src/types/customCommand';

export const prepareCommands = async (client: TournamentionClient) => {
    const commandsPath = pathToFileURL(path.join(process.cwd(), './src/commands'));
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = pathToFileURL(path.join(fileURLToPath(commandsPath), file)).toString();
        const command = (await import(filePath)).default as CustomCommand;
        client.addCommands([{ name: command.data.name, command: command }]);
    }
};