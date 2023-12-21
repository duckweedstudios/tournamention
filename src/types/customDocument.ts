import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { BeAnObject, IObjectWithTypegooseFunction } from '@typegoose/typegoose/lib/types.js';
import { Tournament } from '../backend/schemas/tournament.js';
import { Challenge, ChallengeModel } from '../backend/schemas/challenge.js';
import { Contestant, ContestantModel } from '../backend/schemas/contestant.js';
import { Difficulty, DifficultyModel } from '../backend/schemas/difficulty.js';
import { GuildSettings } from '../backend/schemas/guildsettings.js';
import { Judge } from '../backend/schemas/judge.js';
import { Submission, SubmissionStatus } from '../backend/schemas/submission.js';
import { getChallengesOfTournament } from '../backend/queries/challengeQueries.js';
import { getDifficultiesOfTournament } from '../backend/queries/tournamentQueries.js';

type GenericDocument<T> = Document<ObjectId, BeAnObject, T> & Omit<T & Required<{ _id: ObjectId; }>, 'typegooseName'> & IObjectWithTypegooseFunction;
export type TournamentDocument = GenericDocument<Tournament>;
export type SubmissionDocument = GenericDocument<Submission>;
export type ChallengeDocument = GenericDocument<Challenge>;
export type DifficultyDocument = GenericDocument<Difficulty>;
export type JudgeDocument = GenericDocument<Judge>;
export type GuildSettingsDocument = GenericDocument<GuildSettings>;
export type ContestantDocument = GenericDocument<Contestant>;

// These classes replace any with Ref fields (analogous to foreign keys) with their resolved fields.
// This decouples parts of the codebase from the particulars of the database solution
// AFAIK, typegoose does not provide an equivalent functionality
export class ResolvedChallenge {
    private readonly document: ChallengeDocument;

    public _id!: ObjectId;
    public name!: string;
    public description!: string;
    public difficulty!: DifficultyDocument | null;
    public game!: string;
    public visibility!: boolean;

    public constructor(challenge: ChallengeDocument) {
        this.document = challenge;
    }

    public async make(): Promise<ResolvedChallenge> {
        this._id = this.document._id;
        this.name = this.document.name;
        this.description = this.document.description;
        this.difficulty = await DifficultyModel.findById(this.document.difficulty);
        this.game = this.document.game;
        this.visibility = this.document.visibility;
        return this;
    }
}

export class ResolvedTournament {
    private readonly document: TournamentDocument;

    public _id!: ObjectId;
    public guildId!: string;
    public name!: string;
    public photoURI!: string;
    public active!: boolean;
    public statusDescription!: string;
    public visibility!: boolean;
    public duration!: string;
    public challenges!: ResolvedChallenge[];
    public difficulties!: DifficultyDocument[];

    public constructor(tournament: TournamentDocument) {
        this.document = tournament;
    }

    public async make(): Promise<ResolvedTournament> {
        this._id = this.document._id;
        this.guildId = this.document.guildID;
        this.name = this.document.name;
        this.photoURI = this.document.photoURI;
        this.active = this.document.active;
        this.statusDescription = this.document.statusDescription;
        this.visibility = this.document.visibility;
        this.duration = this.document.duration;
        const challengeDocuments = await getChallengesOfTournament(this.document);
        this.challenges = [];
        for (const challenge of challengeDocuments) {
            this.challenges.push(await new ResolvedChallenge(challenge).make());
        }
        this.difficulties = await getDifficultiesOfTournament(this.document);
        
        return this;
    }
}

export class ResolvedSubmission {
    private readonly document: SubmissionDocument;

    public _id!: ObjectId;
    public challenge!: ResolvedChallenge;
    public contestant!: ContestantDocument;
    public proof!: string;
    public status!: SubmissionStatus;
    public createdAt!: Date;
    public updatedAt!: Date;

    public constructor(submission: SubmissionDocument) {
        this.document = submission;
    }

    public async make(): Promise<ResolvedSubmission> {
        this._id = this.document._id;
        const challenge = await ChallengeModel.findById(this.document.challengeID);
        if (!challenge) throw new Error(`Error in customDocument.ts: Could not find challenge ${this.document.challengeID}`);
        this.challenge = await (new ResolvedChallenge(challenge)).make();
        const contestant = await ContestantModel.findById(this.document.contestantID);
        if (!contestant) throw new Error(`Error in customDocument.ts: Could not find contestant ${this.document.contestantID}`);
        this.contestant = contestant;
        this.proof = this.document.proof;
        this.status = this.document.get('status');
        return this;
    }
}

/**
 * Business logic helper method to convert TournamentDocuments to ResolvedTournaments, thus
 * decoupling the data used by the describer from the database.
 * @param tournaments The list of TournamentDocuments that would be returned in the Outcome.
 * @returns The converted list of ResolvedTournaments, in the same order as the input.
 */
export const resolveTournaments = async (tournaments: TournamentDocument[]): Promise<ResolvedTournament[]> => {
    const resolvedTournaments: ResolvedTournament[] = [];
    for (const tournament of tournaments) {
        const resolvedTournament = await new ResolvedTournament(tournament).make();
        resolvedTournaments.push(resolvedTournament);
    }
    return resolvedTournaments;
};