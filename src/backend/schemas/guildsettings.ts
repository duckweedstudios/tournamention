import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { prop, getModelForClass } from '@typegoose/typegoose';
import { TournamentModel, Tournament } from './tournament';

export class GuildSettings {
    @prop({ required: true, unique: true })
    public guildID!: string;
}

export const GuildSettingsModel = getModelForClass(GuildSettings);

// Oddly, TypeScript suggests `this` is undefined in the method, hence the parameter
GuildSettingsModel.schema.methods.getCurrentTournament = async (thisGuildID: string) => {
    if (!this) return null;
    const guildTournaments = (await TournamentModel.find({ guildID: thisGuildID }));
    const activeTournament = guildTournaments
        .map((t: Document<ObjectId, unknown, Tournament>) => {
            return t.toObject();
        })
        .filter((t: Tournament) => {
            return t.active;
        })
        .reduce((prev: Tournament, curr: Tournament) => {
            // TODO: this may not work
            return !prev.name && prev._id.getTimestamp().getTime() > curr._id.getTimestamp().getTime() ? prev : curr;
        }, new Tournament());
    return activeTournament ? activeTournament : null;
};