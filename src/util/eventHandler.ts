import fs from 'fs';
import path from 'path';
import { TournamentionClient } from 'src/types/client.js';
import { CustomEvent } from 'src/types/customEvent.js';
import { pathToFileURL, fileURLToPath } from 'url';

export const prepareEvents = async (client: TournamentionClient) => {
    const eventsPath = pathToFileURL(path.join(process.cwd(), './src/events'));
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
    for (const file of eventFiles) {
        // const filePath = path.join(eventsPath, file);
        // const event = require(filePath);
        const filePath = pathToFileURL(path.join(fileURLToPath(eventsPath), file)).toString();
        const event = (await import(filePath)).default as CustomEvent;
        if (event.once) {
            client.once(event.name, (args) => event.execute(args));
        } else {
            client.on(event.name, (args) => event.execute(args));
        }
    }
};