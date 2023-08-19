import { ObjectId } from 'mongodb';
import { prop, getModelForClass } from '@typegoose/typegoose';

export class Difficulty {
    _id!: ObjectId;

    @prop({ required: true })
    public emoji!: string;

    @prop({ required: true })
    public pointValue!: number;
}

export const DifficultyModel = getModelForClass(Difficulty);