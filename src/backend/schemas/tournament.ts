import { ObjectId } from 'mongodb';
import { prop, index, getModelForClass } from '@typegoose/typegoose';
import { Challenge } from './challenge';
import { Difficulty } from './difficulty';

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

    @prop({ required: true, type: () => [Challenge] })
    public challenges!: Challenge[];

    @prop({ required: true, type: () => [Difficulty] })
    public difficulties!: Difficulty[];
}

export const TournamentModel = getModelForClass(Tournament);