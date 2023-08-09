import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { prop, getModelForClass } from '@typegoose/typegoose';
import { TournamentModel, Tournament } from './tournament.js';
import { TournamentDocument } from 'src/types/customDocument.js';

export class GuildSettings {
    @prop({ required: true, unique: true })
    public guildID!: string;

    public async getCurrentTournament(): Promise<TournamentDocument | null> {
        // TODO: default value in reduce may not work in practice
        // TODO: test performance WRT frequent .toObject() calls, would a separate array of Tournament be faster?
        const guildTournaments = (await TournamentModel.find({ guildID: this.guildID }));
        const activeTournament = guildTournaments
            .filter((t: TournamentDocument) => {
                return t.toObject().active;
            })
            .reduce((prev: TournamentDocument, curr: TournamentDocument) => {
                const prevTournament: Tournament = prev.toObject();
                const currTournament: Tournament = curr.toObject();
                return !prevTournament.name 
                    && prevTournament._id.getTimestamp().getTime() > currTournament._id.getTimestamp().getTime() 
                    ? prev : curr;
            }, new Document<ObjectId, unknown, Tournament>() as TournamentDocument);
        return activeTournament ? activeTournament : null;
    }
}

export const GuildSettingsModel = getModelForClass(GuildSettings);