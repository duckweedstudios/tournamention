import { ObjectId } from 'mongodb';
import { prop, Ref, getModelForClass } from '@typegoose/typegoose';
import { Judge } from './judge.js';
import { Challenge } from './challenge.js';
import { Contestant } from './contestant.js';

export enum SubmissionStatus {
    /* eslint-disable no-unused-vars */
    Pending = 'Pending',
    Accepted = 'Accepted',
    Rejected = 'Rejected',
}

export class ReviewNote {
    _id!: ObjectId;

    @prop({ required: true, ref: () => Judge})
    public judgeID!: Ref<Judge>;

    @prop({ required: true })
    public note!: string;

    @prop({ required: true })
    public status!: SubmissionStatus;
}

export class Submission {
    @prop({ required: true, ref: () => Challenge, index: true })
    public challengeID!: Ref<Challenge>;

    @prop({ required: true, ref: () => Contestant, index: true })
    public contestantID!: Ref<Contestant>;

    @prop({ required: true })
    public proof!: string;

    @prop({ required: true, type: () => [ReviewNote], default: [] })
    public reviewNotes!: ReviewNote[];
}

export const ReviewNoteModel = getModelForClass(ReviewNote);

export const SubmissionModel = getModelForClass(Submission);

SubmissionModel.schema.virtual('status').get((s: Submission) => {
    if (s.reviewNotes.length === 0) {
        return SubmissionStatus.Pending;
    }
    return s.reviewNotes.reduce(
        (prev: ReviewNote, curr: ReviewNote) => {
            return prev._id.getTimestamp().getTime() > curr._id.getTimestamp().getTime() ? prev : curr;
        }, s.reviewNotes[0]
    ).status;
});