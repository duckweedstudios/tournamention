import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { Ref } from '@typegoose/typegoose';
import { parse } from 'csv-parse/sync';
import { createDifficultyInTournament, getDifficultiesOfTournament } from '../queries/tournamentQueries.js';
import { Tournament } from '../schemas/tournament.js';
import { DifficultyDocument, TournamentDocument } from '../../types/customDocument.js';
import { createChallengesBulk } from '../queries/challengeQueries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourcesPath = path.join(__dirname, '../../../resources/guilds/');

interface CsvRow {
    gameName: string;
    challenge1Description?: string;
    challenge2Description?: string;
    challenge3Description?: string;
    challenge4Description?: string;
    challenge5Description?: string;
}

interface Challenge {
    name: string;
    description: string;
    difficulty: number;
}

export interface GameAndChallenges {
    gameName: string;
    challenges: Challenge[];
}

const downloadCsvFile = async (guildId: string, csvAttachmentUrl: string): Promise<string> => {
    if (!fs.existsSync(path.join(resourcesPath, guildId))) {
        console.log(`Creating folder for server ${guildId}`);
        fs.mkdirSync(path.join(resourcesPath, guildId), { recursive: true });
    }
    const csvFilePath = path.join(resourcesPath, `${guildId}/challenges.csv`);
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(csvFilePath);
        https.get(csvAttachmentUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(csvFilePath);
            });
            file.on('error', (err) => {
                console.error(`Error writing file ${csvFilePath}: ${err}`);
                reject(err);
            });
        }).on('error', (err) => {
            console.error(`Error downloading file from ${csvAttachmentUrl}: ${err}`);
            reject(err);
        });
    });
};

const parseCsvFile = async (csvFilePath: string): Promise<CsvRow[]> => {
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    // Parse CSV, skip first 2 lines (header and title)
    const records = parse(csvContent, {
        skip_empty_lines: true,
        from_line: 3, // skip first 2 lines
        relax_column_count: true,
    });
    const result: CsvRow[] = [];
    for await (const columns of records) {
        if (columns[0]?.length > 30
            || columns[1]?.length > 300
            || columns[2]?.length > 300
            || columns[3]?.length > 300
            || columns[4]?.length > 300
            || columns[5]?.length > 300)
            continue;
        result.push({
            gameName: columns[0]?.trim(),
            challenge1Description: columns[1]?.trim() || undefined,
            challenge2Description: columns[2]?.trim() || undefined,
            challenge3Description: columns[3]?.trim() || undefined,
            challenge4Description: columns[4]?.trim() || undefined,
            challenge5Description: columns[5]?.trim() || undefined,
        });
    }
    return result;
};

const csvRowToGamesAndChallenges = (row: CsvRow): GameAndChallenges => {
    const challenges: Challenge[] = [];
    if (row.challenge1Description) challenges.push({ name: `${row.gameName}: 1`, description: row.challenge1Description, difficulty: 1 });
    if (row.challenge2Description) challenges.push({ name: `${row.gameName}: 2`, description: row.challenge2Description, difficulty: 2 });
    if (row.challenge3Description) challenges.push({ name: `${row.gameName}: 3`, description: row.challenge3Description, difficulty: 3 });
    if (row.challenge4Description) challenges.push({ name: `${row.gameName}: 4`, description: row.challenge4Description, difficulty: 4 });
    if (row.challenge5Description) challenges.push({ name: `${row.gameName}: 5`, description: row.challenge5Description, difficulty: 5 });
    return { gameName: row.gameName, challenges };
};

const createDifficulties = async (tournamentId: Ref<Tournament>): Promise<void> => {
    const difficulties = await getDifficultiesOfTournament(tournamentId);
    const createRequests: Promise<DifficultyDocument>[] = [];
    if (!difficulties.some(d => d.emoji == '2️⃣'))
        createRequests.push(createDifficultyInTournament(tournamentId, '2️⃣', 2));
    if (!difficulties.some(d => d.emoji == '3️⃣'))
        createRequests.push(createDifficultyInTournament(tournamentId, '3️⃣', 3));
    if (!difficulties.some(d => d.emoji == '4️⃣'))
        createRequests.push(createDifficultyInTournament(tournamentId, '4️⃣', 4));
    if (!difficulties.some(d => d.emoji == '5️⃣'))
        createRequests.push(createDifficultyInTournament(tournamentId, '5️⃣', 5));
    await Promise.all(createRequests);
};

const createChallenges = async (tournament: TournamentDocument, gamesAndChallenges: GameAndChallenges[]): Promise<number> =>{
    const result = await createChallengesBulk(tournament, gamesAndChallenges);
    if (result === null) {
        throw new Error('Error in createChallenges: Could not create challenges.');
    }
    return result.length;
};

class ImportChallenges {
    constructor(private readonly guildId: string, private readonly tournament: TournamentDocument, private readonly fileUrl: string) {}

    public async Execute(): Promise<number> {
        /* The CSV file will be in the following format, with comments for explanation:
        Summer Sale Fest 2025!!! July 25th - August 11th,,,,,,, // Skip line 1
        Game Name,Lv. 1 Challenge,Lv. 2 Challenge,Lv. 3 Challenge,Lv. 4 Challenge,Lv. 5 Challenge,Additional Notes,Is/Was Free or Gamepass? // Skip line 2
        Game 1,,G1 Challenge 2,,G1 Challenge 4,,This shouldn't be used,This shouldn't be used // Column 1 is the game name, columns 2-6 are the challenge descriptions (if empty a challenge for that difficulty doesn't exist), following columns are discarded
        Game 2 ,G2 Challenge 1,,G2 Challenge 3,,G2 Challenge 5,,
        Game 3,,G3 Challenge 2,G3 Challenge 3,G3 Challenge 4,,Insert notes here,
        Game 4,G4 Challenge 1,G4 Challenge 2,G4 Challenge 3,G4 Challenge 4,G4 Challenge 5,,Free on Steam
        Game 5,,,,,G5 Challenge 5,,
        */
        const csvFilePath = downloadCsvFile(this.guildId, this.fileUrl);

        const difficultyCreationTask = createDifficulties(this.tournament);

        const gamesAndChallenges = (await parseCsvFile(await csvFilePath))
            .map(csvRowToGamesAndChallenges);

        await difficultyCreationTask;
        return createChallenges(this.tournament, gamesAndChallenges);
    }
}

export default ImportChallenges;