import { prop, index, getModelForClass } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';

@index({ userID: 1, guildID: 1 }, { unique: true })
export class Contestant {
    _id!: ObjectId;

    @prop({ required: true })
    public userID!: string;

    @prop({ required: true })
    public guildID!: string;
}

export const ContestantModel = getModelForClass(Contestant);