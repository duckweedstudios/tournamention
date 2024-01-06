import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import example from './example.js';
import example2 from './example2.js';
import { TournamentionClient } from './types/client.js';
import { prepareCommands } from './util/commandHandler.js';
import { prepareEvents } from './util/eventHandler.js';
import { prepareButtons } from './util/buttonHandler.js';

// Mongoose configuration setting (see https://github.com/Automattic/mongoose/issues/7150)
mongoose.Schema.Types.String.checkRequired(v => v != null);

// Database connection
mongoose.connect(process.env.DB_URI as string, {
    dbName: 'tournamentionDB',
    // Login to user/pass authenticated database
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
})
    .then(() => {
        console.log('Database connection established');
    }).catch((err) => {
        console.log(`Error connecting to database: ${err}}`);
    });

const client = await TournamentionClient.getInstance();

// APPLICATION COMMANDS
prepareCommands(client);

// BUTTONS
prepareButtons(client);

// EVENTS
prepareEvents(client);

client.login(process.env.DISCORD_TOKEN);

console.log(example());
console.log(example2());