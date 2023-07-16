import { prop, getModelForClass } from '@typegoose/typegoose';

export class Contestant {
    @prop({ required: true })
    public userID!: string;

    @prop({ required: true })
    public guildID!: string;
}

export const ContestantModel = getModelForClass(Contestant);
ContestantModel.schema.index({ userID: 1, guildID: 1 }, { unique: true });