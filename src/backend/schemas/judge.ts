import { prop, index, getModelForClass } from '@typegoose/typegoose';
import { ObjectId } from 'mongodb';

@index({ userID: 1, guildID: 1 }, { unique: true })
export class Judge {
    _id!: ObjectId;

    @prop({ required: true, index: true})
    public userID!: string;

    @prop({ required: true, index: true})
    public guildID!: string;

    @prop({ required: true })
    public isActiveJudge!: boolean;
}

export const JudgeModel = getModelForClass(Judge);