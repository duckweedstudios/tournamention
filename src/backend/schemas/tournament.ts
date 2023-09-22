import { ObjectId } from 'mongodb';
import { prop, index, getModelForClass, Ref } from '@typegoose/typegoose';
import { Challenge, ChallengeModel } from './challenge.js';
import { Difficulty, DifficultyModel } from './difficulty.js';

@index({ guildID: 1, name: 1 }, { unique: true })
export class Tournament {
    _id!: ObjectId;

    @prop({ required: true, index: true })
    public guildID!: string;

    @prop({ required: true })
    public name!: string;

    @prop({ required: true })
    public photoURI!: string;

    @prop({ required: true })
    public active!: boolean;

    @prop({ required: true })
    public statusDescription!: string;

    @prop({ required: true })
    public visibility!: boolean;

    @prop({ required: true })
    public duration!: string;

    @prop({ required: true, ref: () => Challenge, type: () => [Challenge], default: [] })
    public challenges!: Ref<Challenge>[];

    @prop({ required: true, ref: () => Difficulty, type: () => [Difficulty], default: [] })
    public difficulties!: Ref<Difficulty>[];
}

export const TournamentModel = getModelForClass(Tournament);

TournamentModel.schema.virtual('resolvingChallenges').get(function() {
    // If this doesn't work then try returning the promise and rename this resolvingChallenges
    return ChallengeModel.find({ _id: { $in: this.challenges } });
});

TournamentModel.schema.virtual('resolvingDifficulties').get(function() {
    // If this doesn't work then try returning the promise and rename this resolvingDifficulties
    return DifficultyModel.find({ _id: { $in: this.difficulties } });
});