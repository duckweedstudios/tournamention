import { Ref } from '@typegoose/typegoose';
import { Tournament, TournamentModel } from '../schemas/tournament.js';
import { Challenge } from '../schemas/challenge.js';
import { DuplicateSubdocumentError } from '../../types/customError.js';
import { Difficulty } from '../schemas/difficulty.js';
import { TournamentDocument } from 'src/types/customDocument.js';

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
export const getTournamentById = async (id: Ref<Tournament>): Promise<TournamentDocument | null> => {
    return TournamentModel.findById(id);
};

export const getTournamentsByGuild = async (guildID: string): Promise<TournamentDocument[] | null> => {
    return TournamentModel.find({ guildID: guildID });
};

export const getTournamentByName = async (guildID: string, name: string): Promise<TournamentDocument | null> => {
    return TournamentModel.findOne({ guildID: guildID, name: name });
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

export const updateTournament = async (id: Ref<Tournament>, name?: string, photoURI?: string, active?: boolean, statusDescription?: string, visibility?: boolean, duration?: string): Promise<TournamentDocument | null> => {
    const update: UpdateTournamentParams = {};
    if (name !== undefined) update.name = name;
    if (photoURI !== undefined) update.photoURI = photoURI;
    if (active !== undefined) update.active = active;
    if (statusDescription !== undefined) update.statusDescription = statusDescription;
    if (visibility !== undefined) update.visibility = visibility;
    if (duration !== undefined) update.duration = duration;

    return TournamentModel.findByIdAndUpdate(id, { $set: update });
};

export const addChallengeToTournament = async (tournamentID: Ref<Tournament>, challenge: Challenge): Promise<TournamentDocument> => {
    const tournament = await TournamentModel.findById(tournamentID);
    if (!tournament) throw new Error('Error in addChallengeToTournament: Tournament not found.');
    for (const challenge of tournament.challenges) {
        if (challenge.name === challenge.name) throw new DuplicateSubdocumentError('Error in addChallengeToTournament: Challenge already exists in tournament.');
    }
    tournament.challenges.push(challenge);
    return tournament.save();
};

export const addDifficultyToTournament = async (tournamentID: Ref<Tournament>, difficulty: Difficulty): Promise<TournamentDocument> => {
    const tournament = await TournamentModel.findById(tournamentID);
    if (!tournament) throw new Error('Error in addDifficultyToTournament: Tournament not found.');
    for (const difficulty of tournament.difficulties) {
        if (difficulty.emoji === difficulty.emoji) throw new DuplicateSubdocumentError('Error in addDifficultyToTournament: Difficulty already exists in tournament.');
    }
    tournament.difficulties.push(difficulty);
    return tournament.save();
};

// DELETE
export const deleteTournament = async (id: Ref<Tournament>): Promise<TournamentDocument | null> => {
    return TournamentModel.findByIdAndDelete(id);
};