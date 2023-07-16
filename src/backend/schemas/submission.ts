import { prop, Ref, getModelForClass } from '@typegoose/typegoose';
import { Judge } from './judge';
import { Challenge } from './challenge';
import { Contestant } from './contestant';

export class ReviewNote {
    @prop({ required: true, type: () => Judge})
    public judgeID!: Ref<Judge>;

    @prop({ required: true })
    public note!: string;

    @prop({ required: true })
    public status!: string;
}

export class Submission {
    @prop({ required: true, type: () => Challenge, index: true })
    public challengeID!: Ref<Challenge>;

    @prop({ required: true, type: () => Contestant, index: true })
    public contestantID!: Ref<Contestant>;

    @prop({ required: true })
    public proof!: string;

    @prop({ required: true, type: () => [ReviewNote] })
    public reviewNotes!: ReviewNote[];
}

// SubmissionSchema.virtual('status').get((s => {
//     s.reviewNotes.reduce((prev: ReviewNote, curr: ReviewNote) => {
//         if (new Schema.Types.ObjectId(prev._id.toString()).getTimestamp())
//     })
// });

export const ReviewNoteModel = getModelForClass(ReviewNote);

export const SubmissionModel = getModelForClass(Submission);