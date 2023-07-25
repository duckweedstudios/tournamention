import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { prop, getModelForClass, /*DocumentType*/ } from '@typegoose/typegoose';
import { TournamentModel, Tournament } from './tournament.js';

export class GuildSettings {
    @prop({ required: true, unique: true })
    public guildID!: string;

    public async getCurrentTournament(/*this: DocumentType<GuildSettings>*/) {
        const guildTournaments = (await TournamentModel.find({ guildID: this.guildID }));
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
    }
}

export const GuildSettingsModel = getModelForClass(GuildSettings);