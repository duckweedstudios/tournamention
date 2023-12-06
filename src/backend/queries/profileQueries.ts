import { UpdateWriteOpResult } from 'mongoose';
import { ChallengeDocument, ContestantDocument, JudgeDocument, SubmissionDocument } from '../../types/customDocument.js';
import { Contestant, ContestantModel } from '../schemas/contestant.js';
import { Judge, JudgeModel } from '../schemas/judge.js';
import { Ref } from '@typegoose/typegoose';
import { SubmissionModel, SubmissionStatus } from '../schemas/submission.js';
import { getSubmissionsFromContestant } from './submissionQueries.js';
import { getChallengeById, getChallengesOfTournament } from './challengeQueries.js';
import { getDifficultyByID } from './tournamentQueries.js';
import { Tournament } from '../schemas/tournament.js';

// CREATE / POST
export const createContestant = async (guildId: string, memberId: string): Promise<ContestantDocument> => {
    return ContestantModel.create({
        guildID: guildId,
        userID: memberId,
    });
};

export const createJudge = async (guildId: string, memberId: string): Promise<JudgeDocument> => {
    return JudgeModel.create({
        guildID: guildId,
        userID: memberId,
        isActiveJudge: true,
    });
};

// READ / GET
/**
 * Gets or creates a Contestant document. Every Discord member who uses a contestant feature is a Contestant.
 * However, being a Contestant may not be sufficient for participation in a Tournament; this depends on the
 * guild's and the Tournament's settings. For this reason, this endpoint can be used for any (well-formed)
 * app interaction involving a Contestant.
 * @param guildId The Discord guild ID.
 * @param memberId The Discord member ID.
 * @returns The new or existing Contestant document.
 */
export const getOrCreateContestant = async (guildId: string, memberId: string): Promise<ContestantDocument> => {
    const contestant = await ContestantModel.findOne({ guildID: guildId, userID: memberId });
    if (contestant) return contestant;
    else return createContestant(guildId, memberId);
};

export const getContestantByGuildIdAndMemberId = async (guildId: string, memberId: string): Promise<ContestantDocument | null> => {
    return ContestantModel.findOne({ guildID: guildId, userID: memberId });
};

export const getContestantById = async (id: Ref<Contestant> | string): Promise<ContestantDocument | null> => {
    return ContestantModel.findById(id);
};

export const getJudgeById = async (id: Ref<Judge> | string): Promise<JudgeDocument | null> => {
    return JudgeModel.findById(id);
};

export const getJudgeByGuildIdAndMemberId = async (guildId: string, memberId: string): Promise<JudgeDocument | null> => {
    return JudgeModel.findOne({ guildID: guildId, userID: memberId }).exec();
};

const getPointSumOfSubmissions = async (submissions: SubmissionDocument[]): Promise<number> => {
    let points = 0;
    for (const submission of submissions) {
        if ((await submission.get('status') as SubmissionStatus) === SubmissionStatus.ACCEPTED) {
            const challenge = await getChallengeById(submission.challengeID);
            if (challenge!.difficulty) {
                points += (await getDifficultyByID(challenge!.difficulty))!.pointValue;
            } else points += 1;
        }
    }
    return points;
};

export const getCareerPointsOfContestant = async (contestantId: Ref<Contestant> | string): Promise<number> => {
    const contestantSubmissions = await getSubmissionsFromContestant(contestantId);
    return getPointSumOfSubmissions(contestantSubmissions);
};

export const getPointsOfContestantForTournament = async (contestantId: Ref<Contestant> | string, tournamentId: Ref<Tournament> | string): Promise<number> => {
    const tournamentChallengeIds = (await getChallengesOfTournament(tournamentId)).map((challenge: ChallengeDocument) => challenge._id);
    const submissions = await SubmissionModel.find().where('contestantID').equals(contestantId).where('challengeID').in(tournamentChallengeIds).exec();
    return getPointSumOfSubmissions(submissions);
};

// UPDATE / PUT
/**
 * Sets an existing Judge document to active or inactive. Does not upsert.
 * @param guildId The Discord guild ID.
 * @param memberId The Discord member ID.
 * @param active If `false` or omitted, sets the Judge to inactive. Otherwise, sets the Judge to active.
 * @returns The result of the update operation.
 */
export const setJudgeActive = async (guildId: string, memberId: string, active: boolean = true): Promise<UpdateWriteOpResult> => {
    return JudgeModel.updateOne({ guildID: guildId, userID: memberId }, { $set: { isActiveJudge: active } }).exec();
};

/**
 * Sets a Judge as `active`, regardless of current status or existence, creating it if needed.
 * In Mongoose terms, upserts the Judge as active.
 * @param guildId The Discord guild ID.
 * @param memberId The Discord member ID.
 * @param active If `false`, sets the Judge to inactive (this is a very atypical use case).
 * Otherwise, sets the Judge to active.
 * @returns The result of the update operation.
 */
export const setOrCreateActiveJudge = async (guildId: string, memberId: string, active: boolean = true): Promise<UpdateWriteOpResult> => {
    return JudgeModel.updateOne({ guildID: guildId, userID: memberId }, { $set: { isActiveJudge: active }}, { upsert: true }).exec();
};

// DELETE