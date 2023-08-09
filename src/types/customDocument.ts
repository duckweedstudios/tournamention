import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { BeAnObject, IObjectWithTypegooseFunction } from '@typegoose/typegoose/lib/types.js';
import { Tournament } from '../backend/schemas/tournament.js';
import { Submission } from 'src/backend/schemas/submission.js';
import { Challenge } from 'src/backend/schemas/challenge.js';
import { Difficulty } from 'src/backend/schemas/difficulty.js';
import { Judge } from 'src/backend/schemas/judge.js';
import { GuildSettings } from 'src/backend/schemas/guildsettings.js';
import { Contestant } from 'src/backend/schemas/contestant.js';

type GenericDocument<T> = Document<ObjectId, BeAnObject, T> & Omit<T & Required<{ _id: ObjectId; }>, 'typegooseName'> & IObjectWithTypegooseFunction;
export type TournamentDocument = GenericDocument<Tournament>;
export type SubmissionDocument = GenericDocument<Submission>;
export type ChallengeDocument = GenericDocument<Challenge>;
export type DifficultyDocument = GenericDocument<Difficulty>;
export type JudgeDocument = GenericDocument<Judge>;
export type GuildSettingsDocument = GenericDocument<GuildSettings>;
export type ContestantDocument = GenericDocument<Contestant>;
