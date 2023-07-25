import { Ref } from '@typegoose/typegoose';
import { Tournament, TournamentModel } from '../schemas/tournament.js';

// CREATE / POST
export const createTournament = async (guildID: string, name: string, photoURI: string, active: boolean, statusDescription: string, visibility: boolean, duration: string) => {
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

// READ / GET
export const getTournamentById = async (id: Ref<Tournament>) => {
    return TournamentModel.findById(id);
};

export const getTournamentsByGuild = async (guildID: string) => {
    return TournamentModel.find({ guildID: guildID });
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

export const updateTournament = async (id: Ref<Tournament>, name?: string, photoURI?: string, active?: boolean, statusDescription?: string, visibility?: boolean, duration?: string) => {
    const update: UpdateTournamentParams = {};
    if (name !== undefined) update.name = name;
    if (photoURI !== undefined) update.photoURI = photoURI;
    if (active !== undefined) update.active = active;
    if (statusDescription !== undefined) update.statusDescription = statusDescription;
    if (visibility !== undefined) update.visibility = visibility;
    if (duration !== undefined) update.duration = duration;

    return TournamentModel.findByIdAndUpdate(id, { $set: update });
};

// DELETE
export const deleteTournament = async (id: Ref<Tournament>) => {
    return TournamentModel.findByIdAndDelete(id);
};