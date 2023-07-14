import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'discord.js';
import example from './example.js';
import example2 from './example2.js';

const client = new Client({
    intents: [],
});
client.login(process.env.DISCORD_TOKEN);

console.log(example());
console.log(example2());

export const index = {};