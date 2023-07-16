import { Schema, Document, model } from 'mongoose';

interface ReviewNote extends Document {
    _id: Schema.Types.ObjectId;
    judgeID: number;
    note: string;
    status: string;
}

interface Submission extends Document {
    _id: Schema.Types.ObjectId;
    challengeID: Schema.Types.ObjectId;
    contestantID: Schema.Types.ObjectId;
    proof: string;
    reviewNotes: ReviewNote[];
}

export const ReviewNoteSchema = new Schema({
    judgeID: { type: Number, require: true },
    note: { type: String },
    status: { type: String, require: true },
});

const SubmissionSchema = new Schema({
    challengeID: { type: Schema.Types.ObjectId, ref: 'Challenge', require: true, index: true },
    contestantID: { type: Schema.Types.ObjectId, ref: 'Contestant', require: true, index: true },
    proof: { type: String, require: true },
    reviewNotes: { type: [ReviewNoteSchema], default: [] },
});

// SubmissionSchema.virtual('status').get((s => {
//     s.reviewNotes.reduce((prev: ReviewNote, curr: ReviewNote) => {
//         if (new Schema.Types.ObjectId(prev._id.toString()).getTimestamp())
//     })
// });

export const ReviewNoteModel = model<ReviewNote>('ReviewNote', ReviewNoteSchema);

export const SubmissionModel = model<Submission>('Submission', SubmissionSchema);