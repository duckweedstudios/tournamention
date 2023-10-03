import { UpdateWriteOpResult } from 'mongoose';
import { ContestantDocument, JudgeDocument } from '../../types/customDocument.js';
import { Contestant, ContestantModel } from '../schemas/contestant.js';
import { Judge, JudgeModel } from '../schemas/judge.js';
import { Ref } from '@typegoose/typegoose';

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