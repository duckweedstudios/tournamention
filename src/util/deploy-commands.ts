import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { RendezvousCommand } from '../commands/slashcommands/architecture/rendezvousCommand.js';

const commands = new Array<RESTPostAPIApplicationCommandsJSONBody>();
const commandsPath = pathToFileURL(path.join(process.cwd(), './src/commands'));
const commandFiles = fs.readdirSync(commandsPath, { encoding: 'utf8', recursive: false }).filter((file: string) => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
    const filePath = pathToFileURL(path.join(fileURLToPath(commandsPath), file)).toString();
    const command = (await import(filePath)).default as RendezvousCommand<unknown, unknown, unknown>;
    commands.push(command.interfacer!.toJSON());
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN as string);

rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID as string, process.env.TESTING_GUILD_ID as string), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);