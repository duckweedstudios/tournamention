import { prop, Ref, getModelForClass } from '@typegoose/typegoose';
import { Difficulty } from './difficulty';

export class Challenge {
    @prop({ required: true, unique: true })
    public name!: string;

    @prop({ required: true })
    public description!: string;

    @prop({ required: true, type: () => Difficulty })
    public difficulty!: Ref<Difficulty>;

    @prop({ required: true })
    public game!: string;

    @prop({ required: true })
    public visibility!: boolean;
}

export const ChallengeModel = getModelForClass(Challenge);