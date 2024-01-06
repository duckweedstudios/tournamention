import { ObjectId } from 'mongodb';
import { ChallengeDocument, TournamentDocument } from '../../types/customDocument.js';
import { Challenge, ChallengeModel } from '../schemas/challenge.js';
import { UpdateChallengeParams } from '../../types/apiPayloadObjects.js';
import { Ref } from '@typegoose/typegoose';
import { Tournament, TournamentModel } from '../schemas/tournament.js';
import { Difficulty } from '../schemas/difficulty.js';
import config from '../../config.js';
// CREATE / POST

// READ / GET
export const getChallengeById = async (id: Ref<Challenge> | string): Promise<ChallengeDocument | null> => {
    return ChallengeModel.findById(id);
};

export const getChallengeOfTournamentByName = async (name: string, tournament: TournamentDocument): Promise<ChallengeDocument | null> => {
    // Each Tournament aggregates its own Challenges, but Challenges do not know their Tournament.
    // Use Mongoose's query builder to filter for Challenges with both the matching name and
    // membership in the tournament's challenge.
    return ChallengeModel.findOne().where('_id').in(tournament.challenges).where('name').equals(name).exec();
};

export const getChallengesOfTournament = async (tournamentId: Ref<Tournament> | string): Promise<ChallengeDocument[]> => {
    const tournament = await TournamentModel.findById(tournamentId);
    return ChallengeModel.find().where('_id').in(tournament!.challenges).exec();
};

type ChallengesAndPageCount = {
    challenges: ChallengeDocument[];
    totalPages: number;
}

export const getChallengesOfTournamentPaged = async (tournamentId: Ref<Tournament> | string, page: number): Promise<ChallengesAndPageCount> => {
    const pageLimit = config.pagination.challengesPerPage;
    const tournament = await TournamentModel.findById(tournamentId);
    const query = ChallengeModel
        .find()
        .where('_id').in(tournament!.challenges)
        .sort({ game: 1, difficulty: 1, name: 1, _id: 1});
    const countQuery = query.clone().countDocuments();
    const totalPages = Math.ceil(await (countQuery.exec()) / pageLimit);
    const challenges = await query.skip(page * pageLimit).limit(pageLimit).exec();
    return { challenges, totalPages };
};

export const getChallengesOfTournamentByGame = async (tournamentId: Ref<Tournament> | string, game: string): Promise<ChallengeDocument[]> => {
    const tournament = await TournamentModel.findById(tournamentId);
    return ChallengeModel.find().where('_id').in(tournament!.challenges).where('game').equals(game).exec();
};

export const getChallengesOfTournamentByGamePaged = async (tournamentId: Ref<Tournament> | string, game: string, page: number): Promise<ChallengesAndPageCount> => {
    const pageLimit = config.pagination.challengesPerPage;
    const tournament = await TournamentModel.findById(tournamentId);
    const query = ChallengeModel
        .find()
        .where('_id').in(tournament!.challenges)
        .where('game').equals(game)
        .sort({ game: 1, difficulty: 1, name: 1, _id: 1});
    const countQuery = query.clone().countDocuments();
    const totalPages = Math.ceil(await (countQuery.exec()) / pageLimit);
    const challenges = await query.skip(page * pageLimit).limit(pageLimit).exec();
    return { challenges, totalPages };
};

export const getChallengesOfTournamentByDifficulty = async (tournamentId: Ref<Tournament> | string, difficulty: Ref<Difficulty> | string): Promise<ChallengeDocument[]> => {
    const tournament = await TournamentModel.findById(tournamentId);
    return ChallengeModel.find().where('_id').in(tournament!.challenges).where('difficulty').equals(difficulty).exec();
};

// UPDATE / PUT
// const updateChallengeByName = async (challenge)

export const updateChallengeById = async (id: ObjectId, update: UpdateChallengeParams): Promise<ChallengeDocument | null> => {
    return ChallengeModel.findByIdAndUpdate(id, { $set: update });
};

// DELETE