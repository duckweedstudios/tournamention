import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import example from './example.js';
import example2 from './example2.js';
import { TournamentionClient } from './types/client.js';
import { prepareCommands } from './util/commandHandler.js';
import { prepareEvents } from './util/eventHandler.js';

// Database connection
mongoose.connect(process.env.DB_URI as string)
    .then(() => {
        console.log('Database connection established');
    }).catch((err) => {
        console.log(`Error connecting to database: ${err}}`);
    });

const client = await TournamentionClient.getInstance();

// APPLICATION COMMANDS
prepareCommands(client);

// EVENTS
prepareEvents(client);

client.login(process.env.DISCORD_TOKEN);

console.log(example());
console.log(example2());