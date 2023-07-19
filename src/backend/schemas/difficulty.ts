import { prop, getModelForClass } from '@typegoose/typegoose';

export class Difficulty {
    @prop({ required: true, unique: true })
    public emoji!: string;

    @prop({ required: true })
    public pointValue!: number;
}

export const DifficultyModel = getModelForClass(Difficulty);