import { prop, getModelForClass } from '@typegoose/typegoose';

export class GuildSettings {
    @prop({ required: true, unique: true })
    public guildID!: string;
}

// TODO: virtual for the active tournament

export const GuildSettingsModel = getModelForClass(GuildSettings);