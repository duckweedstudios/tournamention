import { ObjectId } from 'mongodb';
import { Ref } from '@typegoose/typegoose';
import { Tournament, TournamentModel } from '../schemas/tournament.js';
import { DuplicateSubdocumentError, UserMessageError } from '../../types/customError.js';
import { Difficulty, DifficultyModel } from '../schemas/difficulty.js';
import { ChallengeDocument, DifficultyDocument, TournamentDocument } from '../../types/customDocument.js';

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
    return TournamentModel.findById(id);
};

export const getTournamentsByGuild = async (guildID: string): Promise<TournamentDocument[] | null> => {
    return TournamentModel.find({ guildID: guildID });
};

export const getTournamentByName = async (guildID: string, name: string): Promise<TournamentDocument | null> => {
    return TournamentModel.findOne({ guildID: guildID, name: name });
};

export const isSingleEmoji = (emoji: string): boolean => {
    const emojiRegex = /\p{Emoji_Presentation}/ug;
    const matches = emoji.match(emojiRegex);
    return matches !== null && matches.length === 1;
};

export const getDifficultyByID = async (id: ObjectId): Promise<DifficultyDocument | null> => {
    return DifficultyModel.findById(id);
};

export const getDifficultyByEmoji = async (tournament: TournamentDocument, emoji: string): Promise<DifficultyDocument | null> => {
    if (!isSingleEmoji(emoji)) throw new UserMessageError(`Supplied emoji string ${emoji} is invalid`, `Difficulty must be a single emoji. You used: ${emoji}`);
    for (const difficulty of tournament.difficulties) {
        if (difficulty.emoji === emoji) {
            return getDifficultyByID(difficulty._id);
        }
    }
    return null;
};

// UPDATE / PUT
interface UpdateTournamentParams {
    name?: string;
    photoURI?: string;
    active?: boolean;
    statusDescription?: string;
    visibility?: boolean;
    duration?: string;
}

export const updateTournament = async (id: ObjectId, newName?: string, photoURI?: string, visibility?: boolean, active?: boolean, statusDescription?: string, duration?: string): Promise<TournamentDocument | null> => {
    // TODO: This method is quite messy. Calling code (eg. edit-tournament.ts) should be refactored to exclude unnecessary parameters.
    // Recall before refactoring that this method is meant to 
    // (1) mimic an API endpoint
    // (2) manipulate some object for the Mongoose $set operator (which isn't quite so simple in TS).
    const update: UpdateTournamentParams = {};
    if (newName !== null && newName !== undefined) update.name = newName;
    if (photoURI !== null && photoURI !== undefined) update.photoURI = photoURI;
    if (active !== null && active !== undefined) update.active = active;
    if (statusDescription !== null && statusDescription !== undefined) update.statusDescription = statusDescription;
    if (visibility !== null && visibility !== undefined) update.visibility = visibility;
    if (duration !== null && duration !== undefined) update.duration = duration;

    return TournamentModel.findByIdAndUpdate(id, { $set: update });
};

export const addChallengeToTournament = async (tournamentID: Ref<Tournament>, challenge: ChallengeDocument): Promise<TournamentDocument> => {
    const tournament = await TournamentModel.findById(tournamentID);
    if (!tournament) throw new Error('Error in addChallengeToTournament: Tournament not found.');
    for (const existingChallenge of tournament.challenges) {
        if (existingChallenge.name === challenge.name) throw new DuplicateSubdocumentError(`Error in addChallengeToTournament: Challenge already exists in tournament.`);
    }
    tournament.challenges.push(challenge);
    return tournament.save();
};

// TODO: Batch creation method for challenges
// export const addChallengesToTournament = async (tournamentID: Ref<Tournament>, challenges: ChallengeModel[]): Promise<TournamentDocument> => {
// };

export const addDifficultyToTournament = async (tournamentID: Ref<Tournament>, difficulty: Difficulty): Promise<TournamentDocument> => {
    const tournament = await TournamentModel.findById(tournamentID);
    if (!tournament) throw new Error('Error in addDifficultyToTournament: Tournament not found.');
    for (const existingDifficulty of tournament.difficulties) {
        if (existingDifficulty.emoji === difficulty.emoji) throw new DuplicateSubdocumentError('Error in addDifficultyToTournament: Difficulty already exists in tournament.');
    }
    tournament.difficulties.push(difficulty);
    return tournament.save();
};

// DELETE
export const deleteTournament = async (id: Ref<Tournament>): Promise<TournamentDocument | null> => {
    return TournamentModel.findByIdAndDelete(id);
};