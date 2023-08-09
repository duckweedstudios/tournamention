import { ObjectId } from 'mongodb';
import { prop, Ref, getModelForClass } from '@typegoose/typegoose';
import { Difficulty } from './difficulty.js';

export class Challenge {
    _id!: ObjectId;
    
    @prop({ required: true })
    public name!: string;

    @prop({ required: true })
    public description!: string;

    @prop({ required: true, ref: () => Difficulty })
    public difficulty!: Ref<Difficulty>;

    @prop({ required: true })
    public game!: string;

    @prop({ required: true })
    public visibility!: boolean;
}

export const ChallengeModel = getModelForClass(Challenge);