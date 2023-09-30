import { ReviewNote, ReviewNoteModel, Submission, SubmissionModel, SubmissionStatus } from '../schemas/submission.js';
import { Ref } from '@typegoose/typegoose';
import { Challenge } from '../schemas/challenge.js';
import { Contestant } from '../schemas/contestant.js';
import { Judge } from '../schemas/judge.js';

// CREATE / POST
export const createSubmission = async (challengeID: Ref<Challenge>, contestantID: Ref<Contestant>, proof: string) => {
    return SubmissionModel.create({ 
        challengeID: challengeID,
        contestantID: contestantID,
        proof: proof,
        reviewNotes: [],
    });
};

export const createReviewNoteAndAddTo = async (submissionId: Ref<Submission> | string, judgeId: Ref<Judge> | string, status: SubmissionStatus, note?: string) => {
    const reviewNote = await ReviewNoteModel.create({ 
        judgeID: judgeId,
        note: note ? note : '',
        status: status,
    });
    return addReviewNoteToSubmission(submissionId, reviewNote);
};

// READ / GET
export const getSubmissionById = async (id: Ref<Submission> | string) => {
    return SubmissionModel.findById(id).exec();
};

export const getSubmissionsFromContestant = async (contestantId: Ref<Contestant> | string) => {
    return SubmissionModel.find({ contestantID: contestantId }).exec();
};

export const getSubmissionsForChallenge = async (challengeId: Ref<Challenge> | string) => {
    return SubmissionModel.find({ challengeID: challengeId }).exec();
};

export const getSubmissionsForChallengeFromContestant = async (challengeId: Ref<Challenge> | string, contestantId: Ref<Contestant> | string) => {
    return SubmissionModel.find({ challengeID: challengeId, contestantID: contestantId }).exec();
};

export const getNewestSubmissionForChallengeFromContestant = async (challengeId: Ref<Challenge> | string, contestantId: Ref<Contestant> | string) => {
    return SubmissionModel.findOne({ challengeID: challengeId, contestantID: contestantId }).sort({ createdAt: -1 }).exec();
};

// UPDATE / PUT
export const addReviewNoteToSubmission = async (submissionId: Ref<Submission> | string, reviewNoteId: Ref<ReviewNote> | string) => {
    return SubmissionModel.findOneAndUpdate({ _id: submissionId}, {
        $push: {
            reviewNotes: reviewNoteId,
        }
    }).exec();
};

// DELETE