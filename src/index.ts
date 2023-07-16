import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'discord.js';
import mongoose from 'mongoose';
import example from './example.js';
import example2 from './example2.js';

// Database connection
mongoose.connect(process.env.DB_URI as string)
    .then(() => {
        console.log('Database connection established');
    }).catch((err) => {
        console.log(`Error connecting to database: ${err}}`);
    });

const client = new Client({
    intents: [],
});
client.login(process.env.DISCORD_TOKEN);

console.log(example());
console.log(example2());

export const index = {};