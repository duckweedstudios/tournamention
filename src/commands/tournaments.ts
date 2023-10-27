import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CommandInteractionOption, GuildMember, PermissionsBitField } from 'discord.js';
import { getTournamentsByGuild } from '../backend/queries/tournamentQueries.js';
import { ResolvedTournament, TournamentDocument } from '../types/customDocument.js';
import { OptionValidationError } from '../types/customError.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';
import { LimitedCommandInteraction } from '../types/limitedCommandInteraction.js';
import { OptionValidationErrorOutcome, Outcome, OutcomeStatus, OutcomeWithDuoBody, OutcomeWithMonoBody, SlashCommandDescribedOutcome } from '../types/outcome.js';
import { defaultSlashCommandDescriptions } from '../types/defaultSlashCommandDescriptions.js';
import { ValueOf } from '../types/typelogic.js';
import { Constraint, validateConstraints } from './slashcommands/architecture/validation.js';
import { getJudgeByGuildIdAndMemberId } from '../backend/queries/profileQueries.js';
import { RendezvousSlashCommand } from './slashcommands/architecture/rendezvousCommand.js';

/**
 * Alias for the first generic type of the command.
 */
type T1 = ResolvedTournament[];

/**
 * Alias for the second generic type of the command.
 */
type T2 = void;

/**
 * Status codes specific to this command.
 */
enum _TournamentsSpecificStatus {

}

/**
 * Union of specific and generic status codes.
 */
type TournamentsStatus = OutcomeStatus;

/**
 * Union of specific and generic outcomes.
 */
type TournamentsOutcome = Outcome<T1, T2>;

/**
 * Parameters for the solver function, as well as the "S" generic type.
 */
interface TournamentsSolverParams {
    guildId: string;
    judgeView: boolean;
}

/**
 * Business logic helper method to convert TournamentDocuments to ResolvedTournaments, thus
 * decoupling the data used by the describer from the database.
 * @param tournaments The list of TournamentDocuments that would be returned in the Outcome.
 * @returns The converted list of ResolvedTournaments, in the same order as the input.
 */
const resolveTournaments = async (tournaments: TournamentDocument[]): Promise<ResolvedTournament[]> => {
    const resolvedTournaments: ResolvedTournament[] = [];
    for (const tournament of tournaments) {
        const resolvedTournament = await new ResolvedTournament(tournament).make();
        resolvedTournaments.push(resolvedTournament);
    }
    return resolvedTournaments;
};

/**
 * Retrieves all the tournaments for a given guild.
 * @param guildId The Discord Guild ID.
 * @param judgeView True iff the output will be shown to a Judge/Admin.
 * @returns A list of tournaments. The first tournament will be the current tournament, if one exists.
 * Otherwise, the tournaments are in order of creation (recent-first). If the first tournament in the list isn't
 * active, then there is no current tournament -- thus no active tournaments either.
 */
const tournamentsSolver = async (params: TournamentsSolverParams): Promise<TournamentsOutcome> => {
    try {
        const allTournaments = await getTournamentsByGuild(params.guildId);
        if (!allTournaments) return {
            status: OutcomeStatus.FAIL,
            body: {},
        };
        if (params.judgeView) {
            // Place the current tournament first in the list
            const currentTournament = await getCurrentTournament(params.guildId);
            if (!currentTournament) {
                // No current tournament, but there are tournaments
                allTournaments.reverse();
                return {
                    status: OutcomeStatus.SUCCESS_MONO,
                    body: {
                        data: await resolveTournaments(allTournaments),
                        context: 'tournaments',
                    },
                };
            }
            const orderedTournaments = allTournaments.filter(tournament => !tournament._id.equals(currentTournament._id));
            orderedTournaments.push(currentTournament);
            orderedTournaments.reverse();
            return {
                status: OutcomeStatus.SUCCESS_MONO,
                body: {
                    data: await resolveTournaments(orderedTournaments),
                    context: 'tournaments',
                },
            };
        } else {
            if (allTournaments.filter(tournament => tournament.visibility).length === 0) return ({
                status: OutcomeStatus.FAIL,
                body: {},
            });
            // Place the current tournament first in the list
            const currentTournament = await getCurrentTournament(params.guildId);
            if (!currentTournament) {
                // No current tournament, but there are tournaments
                allTournaments.reverse();
                return {
                    status: OutcomeStatus.SUCCESS_MONO,
                    body: {
                        data: await resolveTournaments(allTournaments.filter(tournament => tournament.visibility)),
                        context: 'tournaments',
                    },
                };
            }
            // If there is a current tournament, but it's hidden, display a distinct message
            if (!currentTournament.visibility) {
                allTournaments.reverse();
                return {
                    status: OutcomeStatus.SUCCESS_DUO,
                    body: {
                        data1: await resolveTournaments(allTournaments.filter(tournament => tournament.visibility).filter(tournament => tournament._id !== currentTournament._id)),
                        context1: 'tournaments',
                        data2: await resolveTournaments([currentTournament]),
                        context2: 'hidden current tournament',
                    },
                };
            }
            const orderedTournaments = allTournaments.filter(tournament => tournament.visibility).filter(tournament => tournament._id !== currentTournament._id);
            orderedTournaments.push(currentTournament);
            orderedTournaments.reverse();
            return {
                status: OutcomeStatus.SUCCESS_MONO,
                body: {
                    data: await resolveTournaments(orderedTournaments),
                    context: 'tournaments',
                },
            };
        }
    } catch (err) {
        // No expected thrown errors
    }

    return ({
        status: OutcomeStatus.FAIL_UNKNOWN,
        body: {},
    });
};

const tournamentsSlashCommandValidator = async (interaction: LimitedCommandInteraction): Promise<TournamentsSolverParams | OptionValidationErrorOutcome<T1>> => {
    // Validator for this command has the unique responsibility of determining whether to call
    // business logic method for Judge/Admin or Contestant data
    const guildId = interaction.guildId!;

    const metadataConstraints = new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([]);
    const optionConstraints = new Map<CommandInteractionOption | null, Constraint<ValueOf<CommandInteractionOption>>[]>([]);

    const judge = await getJudgeByGuildIdAndMemberId(guildId, (interaction.member as GuildMember).id);
    const memberIsJudgeOrAdmin = (judge && judge.isActiveJudge) || (interaction.member as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator);
    // contestantView is True iff user supplies True.
    // judgeView <=> !contestantView && memberIsJudgeOrAdmin
    let contestantView: boolean;
    try {
        contestantView = interaction.options.get('contestantview', false)?.value as boolean ?? false;

        await validateConstraints(interaction, metadataConstraints, optionConstraints);
    } catch (err) {
        if (err instanceof OptionValidationError) return {
            status: OutcomeStatus.FAIL_VALIDATION,
            body: {
                constraint: err.constraint,
                field: err.field,
                value: err.value,
                context: err.message,
            },
        };

        throw err;
    }

    const judgeView = !contestantView && memberIsJudgeOrAdmin;

    return {
        guildId: guildId,
        judgeView: judgeView,
    };
};

/**
 * Converts a ResolvedTournament to a string of a 2-line format.
 * @param tournament 
 * @returns A string with the format:
 * 
 * **My Tournament** (5 challenges: 2 🔥 1 💀)
 * 
 * {status description} ({duration})
 */
const formatTournamentDetails = (tournament: ResolvedTournament): string => {
    // **My Tournament** (5 challenges
    let message = `**${tournament.name}** (${tournament.challenges.length} ${tournament.challenges.length !== 1 ? 'challenges' : 'challenge'}`;
    // :
    if (tournament.challenges.some(challenge => challenge.difficulty)) message += ':';
    // 2 🔥 1 💀
    for (const difficulty of tournament.difficulties) {
        const challengesOfDifficultCount = tournament.challenges.filter(challenge => challenge.difficulty?._id.equals(difficulty._id)).length;
        if (challengesOfDifficultCount > 0) message += ` ${challengesOfDifficultCount} ${difficulty.emoji}`;
    }
    // )
    message += ')';
    // {status description} ({duration})
    message += `\n\t*${tournament.statusDescription || '(no description)'}* (${tournament.duration || 'no duration'})`;

    return message;
};

const tournamentsSlashCommandDescriptions = new Map<TournamentsStatus, (o: TournamentsOutcome) => SlashCommandDescribedOutcome>([
    [OutcomeStatus.SUCCESS_MONO, (o: TournamentsOutcome) => {
        const oBody = (o as OutcomeWithMonoBody<T1>).body;
        let message = '';
        if (oBody.data[0].active) {
            message += `The current tournament:\n${formatTournamentDetails(oBody.data[0])}`;
            oBody.data.shift();
        }
        const activeTournaments = oBody.data.filter(tournament => tournament.active);
        const inactiveTournaments = oBody.data.filter(tournament => !tournament.active);
        if (activeTournaments.length > 0) {
            message += `\n\nOther active tournaments:`;
            activeTournaments.forEach(tournament => {
                message += `\n${formatTournamentDetails(tournament)}`;
            });
        }
        if (inactiveTournaments.length > 0) {
            message += `\n\nInactive tournaments:`;
            inactiveTournaments.forEach(tournament => {
                message += `\n${formatTournamentDetails(tournament)}`;
            });
        }
        return {
            userMessage: message, ephemeral: true,
        };
    }],
    [OutcomeStatus.SUCCESS_DUO, (o: TournamentsOutcome) => {
        const oBody = (o as OutcomeWithDuoBody<T1>).body;
        let resultString = 'The current tournament is *hidden*.';
        const activeTournaments = oBody.data1.filter(tournament => tournament.active);
        const inactiveTournaments = oBody.data1.filter(tournament => !tournament.active);
        if (activeTournaments.length > 0) resultString += `\n\nActive tournaments: ${activeTournaments.map(tournament => `**${tournament.name}**`).join(', ')}`;
        if (inactiveTournaments.length > 0) resultString += `\n\nInactive tournaments: ${inactiveTournaments.map(tournament => `**${tournament.name}**`).join(', ')}`;
        
        return {
            userMessage: resultString, ephemeral: true,
        };
    }],
    [OutcomeStatus.FAIL, (_: TournamentsOutcome) => ({
        userMessage: 'There were tournaments found in this server.', ephemeral: true,
    })],
]);

const tournamentsSlashCommandOutcomeDescriber = (outcome: TournamentsOutcome): SlashCommandDescribedOutcome => {
    if (tournamentsSlashCommandDescriptions.has(outcome.status)) return tournamentsSlashCommandDescriptions.get(outcome.status)!(outcome);
    // Fallback to trying default descriptions
    const defaultOutcome = outcome as Outcome<string>;
    if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
        return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
    } else return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
};

const tournamentsSlashCommandReplyer = async (interaction: CommandInteraction, describedOutcome: SlashCommandDescribedOutcome): Promise<void> => {
    interaction.reply({ content: describedOutcome.userMessage, ephemeral: describedOutcome.ephemeral });
};

const TournamentsCommand = new RendezvousSlashCommand<TournamentsOutcome, TournamentsSolverParams, T1>(
    new SlashCommandBuilder()
        .setName('tournaments')
        .setDescription('Show the tournaments happening in the server.')
        .addBooleanOption(option => option.setName('contestantview').setDescription('Judges can use True to only show visible tournaments, to see what a contestant sees.').setRequired(false)) as SlashCommandBuilder,
    tournamentsSlashCommandReplyer,
    tournamentsSlashCommandOutcomeDescriber,
    tournamentsSlashCommandValidator,
    tournamentsSolver,
);

export default TournamentsCommand;