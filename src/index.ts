import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import example from './example.js';
import example2 from './example2.js';
import { TournamentionClient } from './types/client.js';

// Database connection
mongoose.connect(process.env.DB_URI as string)
    .then(() => {
        console.log('Database connection established');
    }).catch((err) => {
        console.log(`Error connecting to database: ${err}}`);
    });

const client = await TournamentionClient.getInstance();

// APPLICATION COMMANDS
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    client.addCommands([{ name: command.data.name, command: command }]);
}

client.login(process.env.DISCORD_TOKEN);

console.log(example());
console.log(example2());

export const index = {};