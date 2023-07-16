import { prop, getModelForClass } from '@typegoose/typegoose';

export class Judge {
    @prop({ required: true, index: true})
    public userID!: string;

    @prop({ required: true, index: true})
    public guildID!: string;

    @prop({ required: true })
    public isActiveJudge!: boolean;
}

export const JudgeModel = getModelForClass(Judge);