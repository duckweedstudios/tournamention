import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { TournamentionClient } from '../types/client.js';

export const prepareCommands = async (client: TournamentionClient) => {
    const commandsPath = pathToFileURL(path.join(process.cwd(), './src/commands'));
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = pathToFileURL(path.join(fileURLToPath(commandsPath), file)).toString();
        const command = (await import(filePath)).default;
        client.addCommands([{ name: command.interfacer.name, command: command }]);
    }
};