import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { TournamentionClient } from '../types/client.js';

export const prepareCommands = async (client: TournamentionClient) => {
    const commandsPath = pathToFileURL(path.join(process.cwd(), './src/commands'));
    let commandFiles = new Array<string>();
    // Slash commands (also known as Chat Input commands)
    const slashCommandsPath = pathToFileURL(path.join(fileURLToPath(commandsPath), './slashcommands'));
    commandFiles = commandFiles.concat(fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts')));
    // Message commands
    const messageCommandsPath = pathToFileURL(path.join(fileURLToPath(commandsPath), './messagecommands'));
    commandFiles = commandFiles.concat(fs.readdirSync(messageCommandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts')));

    for (const file of commandFiles) {
        const filePath = pathToFileURL(path.join(fileURLToPath(slashCommandsPath), file)).toString();
        const command = (await import(filePath)).default;
        client.addCommands([{ name: command.interfacer.name, command: command }]);
    }
};