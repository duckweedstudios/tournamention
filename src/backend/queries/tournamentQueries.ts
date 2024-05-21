import { ObjectId } from 'mongodb';
import { Ref } from '@typegoose/typegoose';
import { Tournament, TournamentModel } from '../schemas/tournament.js';
import { DuplicateSubdocumentError, UserMessageError } from '../../types/customError.js';
import { Difficulty, DifficultyModel } from '../schemas/difficulty.js';
import { ChallengeDocument, DifficultyDocument, TournamentDocument } from '../../types/customDocument.js';
import { UpdateTournamentParams } from '../../types/apiPayloadObjects.js';

// CREATE / POST
export const createTournament = async (guildID: string, name: string, photoURI: string, active: boolean, statusDescription: string, visibility: boolean, duration: string): Promise<TournamentDocument> => {
    return TournamentModel.create({
        guildID: guildID,
        name: name,
        photoURI: photoURI,
        active: active,
        statusDescription: statusDescription,
        visibility: visibility,
        duration: duration,
    });
};

/**
 * Creates a Difficulty document if emoji is unique in the Tournament, then adds it to the Tournament.
 * @param tournamentId 
 * @param emoji A single emoji string. Must be unique to the Tournament.
 * @param pointValue A non-negative integer.
 * @returns The `DifficultyDocument` of the new Difficulty.
 * @throws `DuplicateSubdocumentError` if emoji already exists in the Tournament.
 */
export const createDifficultyInTournament = async (tournamentId: Ref<Tournament>, emoji: string, pointValue: number): Promise<DifficultyDocument> => {
    const tournamentDifficulties = await getDifficultiesOfTournament(tournamentId);
    if (tournamentDifficulties.some((difficulty) => difficulty.emoji === emoji)) throw new DuplicateSubdocumentError(`Error in createDifficulty: Difficulty with emoji ${emoji} already exists in tournament with ID ${tournamentId}.`);
    const difficulty = await DifficultyModel.create({
        emoji: emoji,
        pointValue: pointValue,
    });
    await addDifficultyToTournament(tournamentId, difficulty);
    return difficulty;
};

export class TournamentBuilder {
    private name: string | null;
    private photoURI: string;
    private active: boolean;
    private statusDescription: string;
    private visibility: boolean;
    private duration: string;

    constructor() {
        this.name = null;
        this.photoURI = '';
        this.active = true;
        this.statusDescription = '';
        this.visibility = true;
        this.duration = '';
    }

    public setName(name: string): TournamentBuilder {
        this.name = name;
        return this;
    }

    public setPhotoURI(photoURI: string): TournamentBuilder {
        this.photoURI = photoURI;
        return this;
    }

    public setActive(active: boolean): TournamentBuilder {
        this.active = active;
        return this;
    }

    public setStatusDescription(statusDescription: string): TournamentBuilder {
        this.statusDescription = statusDescription;
        return this;
    }

    public setVisibility(visibility: boolean): TournamentBuilder {
        this.visibility = visibility;
        return this;
    }

    public setDuration(duration: string): TournamentBuilder {
        this.duration = duration;
        return this;
    }

    public async buildForGuild(guildID: string): Promise<TournamentDocument> {
        if (!guildID || !this.name) throw new Error('Error in TournamentBuilder: A required property in {guildID, name} not set.');
        return TournamentModel.create({
            guildID: guildID,
            name: this.name,
            photoURI: this.photoURI,
            active: this.active,
            statusDescription: this.statusDescription,
            visibility: this.visibility,
            duration: this.duration,
        });
    }
}

// READ / GET
export const getTournamentById = async (id: ObjectId): Promise<TournamentDocument | null> => {
    return TournamentModel.findById(id).exec();
};

export const getTournamentsByGuild = async (guildID: string): Promise<TournamentDocument[] | null> => {
    return TournamentModel.find({ guildID: guildID }).exec();
};

export const getTournamentByName = async (guildID: string, name: string): Promise<TournamentDocument | null> => {
    return TournamentModel.findOne({ guildID: guildID, name: name }).exec();
};

const explicitSupportedEmojis = ['2️⃣', '3️⃣', '4️⃣', '5️⃣'];

export const isSingleEmoji = (emoji: string): boolean => {
    const emojiRegex = /\p{Emoji_Presentation}/ug;
    const matches = emoji.match(emojiRegex);
    return (matches !== null && matches.length === 1) || explicitSupportedEmojis.includes(emoji);
};

export const getDifficultyByID = async (id: Ref<Difficulty> | string): Promise<DifficultyDocument | null> => {
    return DifficultyModel.findById(id).exec();
};

export const getDifficultyByEmoji = async (tournament: TournamentDocument, emoji: string): Promise<DifficultyDocument | null> => {
    if (!isSingleEmoji(emoji)) throw new UserMessageError(`Supplied emoji string ${emoji} is invalid`, `Difficulty must be a single emoji. You used: ${emoji}`);
    const resolvedDifficulties = await tournament.get('resolvingDifficulties') as DifficultyDocument[];
    if (!resolvedDifficulties) throw new Error(`Error in tournamentQueries.ts: Could not get difficulties for tournament ${tournament._id}`);
    for (const difficulty of resolvedDifficulties) {
        if (difficulty.emoji === emoji) {
            return getDifficultyByID(difficulty);
        }
    }
    return null;
};

export const getDifficultiesOfTournament = async (tournamentId: Ref<Tournament> | string): Promise<DifficultyDocument[]> => {
    const tournament = await TournamentModel.findById(tournamentId).exec();
    return DifficultyModel.find().where('_id').in(tournament!.difficulties).exec();
};

// UPDATE / PUT
export const updateTournament = async (id: ObjectId, update: UpdateTournamentParams): Promise<TournamentDocument | null> => {
    return TournamentModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
};

export const addChallengeToTournament = async (tournamentID: Ref<Tournament>, challenge: ChallengeDocument): Promise<TournamentDocument> => {
    const tournament = await TournamentModel.findById(tournamentID).exec();
    if (!tournament) throw new Error('Error in addChallengeToTournament: Tournament not found.');
    const resolvedChallenges = await tournament.get('resolvingChallenges') as ChallengeDocument[];
    for (const existingChallenge of resolvedChallenges) {
        if (existingChallenge.name === challenge.name) throw new DuplicateSubdocumentError(`Error in addChallengeToTournament: Challenge already exists in tournament.`);
    }
    tournament.challenges.push(challenge);
    return tournament.save();
};

// TODO: Batch creation method for challenges
// export const addChallengesToTournament = async (tournamentID: Ref<Tournament>, challenges: ChallengeModel[]): Promise<TournamentDocument> => {
// };

const addDifficultyToTournament = async (tournamentID: Ref<Tournament>, difficulty: DifficultyDocument): Promise<TournamentDocument> => {
    const tournament = await TournamentModel.findById(tournamentID).exec();
    if (!tournament) throw new Error('Error in addDifficultyToTournament: Tournament not found.');
    const resolvedDifficulties = await tournament.get('resolvingDifficulties') as DifficultyDocument[];
    for (const existingDifficulty of resolvedDifficulties) {
        if (existingDifficulty.emoji === difficulty.emoji) throw new DuplicateSubdocumentError('Error in addDifficultyToTournament: Difficulty already exists in tournament.');
    }
    tournament.difficulties.push(difficulty);
    return tournament.save();
};

// DELETE
// TODO: Delete all challenges and difficulties from tournament
export const deleteTournament = async (id: Ref<Tournament>): Promise<TournamentDocument | null> => {
    return TournamentModel.findByIdAndDelete(id).exec();
};