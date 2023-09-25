import { ObjectId } from 'mongodb';
import { ChallengeDocument, TournamentDocument } from '../../types/customDocument.js';
import { ChallengeModel } from '../schemas/challenge.js';
import { UpdateChallengeParams } from '../../types/apiPayloadObjects.js';
// CREATE / POST

// READ / GET
export const getChallengeById = async (id: ObjectId): Promise<ChallengeDocument | null> => {
    return ChallengeModel.findById(id);
};

export const getChallengeOfTournamentByName = async (name: string, tournament: TournamentDocument): Promise<ChallengeDocument | null> => {
    // Each Tournament aggregates its own Challenges, but Challenges do not know their Tournament.
    // Use Mongoose's query builder to filter for Challenges with both the matching name and
    // membership in the tournament's challenge.
    return ChallengeModel.findOne().where('_id').in(tournament.challenges).where('name').equals(name).exec();
};

// UPDATE / PUT
// const updateChallengeByName = async (challenge)

export const updateChallengeById = async (id: ObjectId, update: UpdateChallengeParams): Promise<ChallengeDocument | null> => {
    return ChallengeModel.findByIdAndUpdate(id, { $set: update });
};

// DELETE