import { ReviewNote, ReviewNoteModel, Submission, SubmissionModel, SubmissionStatus } from '../schemas/submission.js';
import { Ref } from '@typegoose/typegoose';
import { Challenge } from '../schemas/challenge.js';
import { Contestant } from '../schemas/contestant.js';
import { Judge } from '../schemas/judge.js';
import { Types as MongooseTypes, UpdateWriteOpResult } from 'mongoose';

// CREATE / POST
export const createSubmission = async (challengeID: Ref<Challenge>, contestantID: Ref<Contestant>, proof: string) => {
    return SubmissionModel.create({ 
        challengeID: challengeID,
        contestantID: contestantID,
        proof: proof,
        reviewNotes: [],
    });
};
    
/**
 * Upserts a ReviewNote, and adds it to the Submission's reviewNotes array if inserted. Note that
 * this should only be used to upsert the newest ReviewNote.
 * @param submissionId The Submission that will receive the ReviewNote update or the new ReviewNote.
 * @param judgeId The Judge document ID of the Judge who submitted the review.
 * @param status The new status of the ReviewNote.
 * @param note The optional note the Judge submitted with the review.
 * @returns The UpdateWriteOpResult, where the `matchedCount`, `modifiedCount`, and `upsertedCount`
 * values correspond as noted, where only certain values are indicative of the result:
 * - `1 0 ?`: An existing ReviewNote was not updated.
 * - `1 1 ?`: An existing ReviewNote was updated.
 * - `0 ? 1`: A new ReviewNote was created.
 */
export const createOrUpdateReviewNoteAndAddTo = async (submissionId: Ref<Submission> | string, judgeId: Ref<Judge> | string, status: SubmissionStatus, note?: string): Promise<UpdateWriteOpResult> => {
    const submission = await getSubmissionById(submissionId);
    if (!submission) throw new Error(`Error in submissionQueries.ts: Could not find submission ${submissionId}`);

    // Appeal the previous review note, if it exists. Otherwise, add the new review note.
    // First argument's complicated expression will become
    // { id: idOfNewestReviewNote } or { id: brandNewId }, inserting in the latter case
    // It's unconventional to generate an ObjectId manually, but timestamps will be close enough
    // and there is no (probabilistic) risk of collision.
    const reviewNoteUpdate = await ReviewNoteModel.updateOne({ ...(submission.reviewNotes.length > 0 ? { _id: submission.reviewNotes[submission.reviewNotes.length - 1]._id } : { _id: new MongooseTypes.ObjectId() }) }, {
        $set: {
            judgeID: judgeId,
            status: status,
            note: note ? note : '',
        }
    }, { upsert: true }).exec();

    // If a new review note was created, add it to the submission
    if (reviewNoteUpdate.matchedCount === 0) await addReviewNoteToSubmission(submissionId, reviewNoteUpdate.upsertedId!.toString());
    return reviewNoteUpdate;
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

export const getReviewNoteById = async (id: Ref<ReviewNote> | string) => {
    return ReviewNoteModel.findById(id).exec();
};

// UPDATE / PUT
export const addReviewNoteToSubmission = async (submissionId: Ref<Submission> | string, reviewNoteId: Ref<ReviewNote> | string): Promise<UpdateWriteOpResult> => {
    return SubmissionModel.updateOne({ _id: submissionId}, {
        $push: {
            reviewNotes: reviewNoteId,
        }
    }).exec();
};

// DELETE