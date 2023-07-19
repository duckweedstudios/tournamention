import { ReviewNoteModel, Submission, SubmissionModel, SubmissionStatus } from '../schemas/submission';
import { Ref } from '@typegoose/typegoose';
import { Challenge } from '../schemas/challenge';
import { Contestant } from '../schemas/contestant';
import { Judge } from '../schemas/judge';

// CREATE / POST
export const createSubmission = async (challengeID: Ref<Challenge>, contestantID: Ref<Contestant>, proof: string) => {
    return SubmissionModel.create({ 
        challengeID: challengeID,
        contestantID: contestantID,
        proof: proof,
    });
};

// READ / GET
export const getSubmissionById = async (id: Ref<Submission> | string) => {
    return SubmissionModel.findById(id);
};

export const getSubmissionsFromContestant = async (contestantID: Ref<Contestant>) => {
    return SubmissionModel.find({ contestantID: contestantID });
};

export const getSubmissionsForChallenge = async (challengeID: Ref<Challenge>) => {
    return SubmissionModel.find({ challengeID: challengeID });
};

// UPDATE / PUT
export const addReviewNoteToSubmission = async (submission: Ref<Submission>, judgeID: Ref<Judge>, note: string, reviewStatus: SubmissionStatus) => {
    SubmissionModel.findOneAndUpdate({ _id: submission}, {
        $push: {
            reviewNotes: new ReviewNoteModel({ judgeID: judgeID, note: note, status: reviewStatus }),
        }
    });
};

// DELETE