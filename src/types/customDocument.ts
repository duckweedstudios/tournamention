import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { BeAnObject, IObjectWithTypegooseFunction } from '@typegoose/typegoose/lib/types.js';
import { Tournament } from '../backend/schemas/tournament.js';
import { Challenge } from '../backend/schemas/challenge.js';
import { Contestant } from '../backend/schemas/contestant.js';
import { Difficulty } from '../backend/schemas/difficulty.js';
import { GuildSettings } from '../backend/schemas/guildsettings.js';
import { Judge } from '../backend/schemas/judge.js';
import { Submission } from '../backend/schemas/submission.js';

type GenericDocument<T> = Document<ObjectId, BeAnObject, T> & Omit<T & Required<{ _id: ObjectId; }>, 'typegooseName'> & IObjectWithTypegooseFunction;
export type TournamentDocument = GenericDocument<Tournament>;
export type SubmissionDocument = GenericDocument<Submission>;
export type ChallengeDocument = GenericDocument<Challenge>;
export type DifficultyDocument = GenericDocument<Difficulty>;
export type JudgeDocument = GenericDocument<Judge>;
export type GuildSettingsDocument = GenericDocument<GuildSettings>;
export type ContestantDocument = GenericDocument<Contestant>;