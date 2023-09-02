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
    _id!: ObjectId;

    @prop({ required: true, ref: () => Challenge, index: true })
    public challengeID!: Ref<Challenge>;

    @prop({ required: true, ref: () => Contestant, index: true })
    public contestantID!: Ref<Contestant>;

    @prop({ required: true })
    public proof!: string;

    @prop({ required: true, ref: () => ReviewNote, type: () => [ReviewNote], default: [] })
    public reviewNotes!: Ref<ReviewNote>[];
}

export const ReviewNoteModel = getModelForClass(ReviewNote);

export const SubmissionModel = getModelForClass(Submission);

SubmissionModel.schema.virtual('resolvedReviewNotes').get(async function() {
    // If this doesn't work then try returning the promise and rename this resolvingReviewNotes
    // or try using the populate() method https://typegoose.github.io/typegoose/docs/api/virtuals/#virtual-populate
    return await ReviewNoteModel.find({ _id: { $in: this.reviewNotes } }) as ReviewNote[];
});

SubmissionModel.schema.virtual('status').get(async function() {
    if (this.reviewNotes.length === 0) {
        return SubmissionStatus.Pending;
    }
    const resolvedReviewNotes: ReviewNote[] = this.get('resolvedReviewNotes');
    if (!resolvedReviewNotes) throw new Error(`Error in submission.ts: Could not get review notes for submission ${this._id}`);
    return resolvedReviewNotes.reduce(
        (prev: ReviewNote, curr: ReviewNote) => {
            return prev._id.getTimestamp().getTime() > curr._id.getTimestamp().getTime() ? prev : curr;
        }, resolvedReviewNotes[0]
    ).status;
});