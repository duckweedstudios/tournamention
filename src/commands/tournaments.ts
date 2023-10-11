import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, CommandInteractionOption, GuildMember, PermissionsBitField } from 'discord.js';
import { CustomCommand } from '../types/customCommand.js';
import { getTournamentsByGuild } from '../backend/queries/tournamentQueries.js';
import { TournamentDocument } from '../types/customDocument.js';
import { OptionValidationError } from '../types/customError.js';
import { getCurrentTournament } from '../backend/queries/guildSettingsQueries.js';
import { LimitedCommandInteraction, limitCommandInteraction } from '../types/limitedCommandInteraction.js';
import { Outcome, OutcomeStatus, OutcomeWithDuoBody, OutcomeWithMonoBody, SlashCommandDescribedOutcome } from '../types/outcome.js';
import { defaultSlashCommandDescriptions } from '../types/defaultSlashCommandDescriptions.js';
import { ValueOf } from '../types/typelogic.js';
import { Constraint, validateConstraints } from './slashcommands/architecture/validation.js';
import { getJudgeByGuildIdAndMemberId } from '../backend/queries/profileQueries.js';

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
type TournamentsOutcome = Outcome<TournamentDocument[]>;

/**
 * Retrieves all the tournaments for a given guild.
 * @param guildId The Discord Guild ID.
 * @param judgeView True iff the output will be shown to a Judge/Admin.
 * @returns A list of tournaments. The first tournament will be the current tournament, if one exists.
 * Otherwise, the tournaments are in order of creation (recent-first). If the first tournament in the list isn't
 * active, then there is no current tournament -- thus no active tournaments either.
 */
const tournaments = async (guildId: string, judgeView: boolean): Promise<TournamentsOutcome> => {
    try {
        const allTournaments = await getTournamentsByGuild(guildId);
        if (!allTournaments) return {
            status: OutcomeStatus.FAIL,
            body: {},
        };
        if (judgeView) {
            // Place the current tournament first in the list
            const currentTournament = await getCurrentTournament(guildId);
            if (!currentTournament) {
                // No current tournament, but there are tournaments
                allTournaments.reverse();
                return {
                    status: OutcomeStatus.SUCCESS_MONO,
                    body: {
                        data: allTournaments,
                        context: 'tournaments',
                    },
                };
            }
            const orderedTournaments = allTournaments.filter(tournament => tournament._id !== currentTournament._id);
            orderedTournaments.push(currentTournament);
            orderedTournaments.reverse();
            return {
                status: OutcomeStatus.SUCCESS_MONO,
                body: {
                    data: orderedTournaments,
                    context: 'tournaments',
                },
            };
        } else {
            // Place the current tournament first in the list
            const currentTournament = await getCurrentTournament(guildId);
            if (!currentTournament) {
                // No current tournament, but there are tournaments
                allTournaments.reverse();
                return {
                    status: OutcomeStatus.SUCCESS_MONO,
                    body: {
                        data: allTournaments.filter(tournament => tournament.visibility),
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
                        data1: allTournaments.filter(tournament => tournament.visibility).filter(tournament => tournament._id !== currentTournament._id),
                        context1: 'tournaments',
                        data2: [currentTournament],
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
                    data: orderedTournaments,
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

const tournamentsSlashCommandValidator = async (interaction: LimitedCommandInteraction): Promise<TournamentsOutcome> => {
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
    console.log(`DEBUG: contestantView: ${contestantView}, judgeView: ${judgeView}`);

    return await tournaments(guildId, judgeView);
    
};

const tournamentsSlashCommandDescriptions = new Map<TournamentsStatus, (o: TournamentsOutcome) => SlashCommandDescribedOutcome>([
    [OutcomeStatus.SUCCESS_MONO, (o: TournamentsOutcome) => {
        const oBody = (o as OutcomeWithMonoBody<TournamentDocument[]>).body;
        let resultString = '';
        if (oBody.data[0].active) {
            resultString += `The current tournament is **${oBody.data[0].name}**.`;
            oBody.data.shift();
        }
        const activeTournaments = oBody.data.filter(tournament => tournament.active);
        const inactiveTournaments = oBody.data.filter(tournament => !tournament.active);
        if (activeTournaments.length > 0) resultString += `\n\nActive tournaments: ${activeTournaments.map(tournament => `**${tournament.name}**`).join(', ')}`;
        if (inactiveTournaments.length > 0) resultString += `\n\nInactive tournaments: ${inactiveTournaments.map(tournament => `**${tournament.name}**`).join(', ')}`;
        
        return {
            userMessage: resultString, ephemeral: true,
        };
    }],
    [OutcomeStatus.SUCCESS_DUO, (o: TournamentsOutcome) => {
        const oBody = (o as OutcomeWithDuoBody<TournamentDocument[]>).body;
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

const tournamentsSlashCommandOutcomeDescriber = async (interaction: LimitedCommandInteraction): Promise<SlashCommandDescribedOutcome> => {
    const outcome = await tournamentsSlashCommandValidator(interaction);
    if (tournamentsSlashCommandDescriptions.has(outcome.status)) return tournamentsSlashCommandDescriptions.get(outcome.status)!(outcome);
    // Fallback to trying default descriptions
    const defaultOutcome = outcome as Outcome<string>;
    if (defaultSlashCommandDescriptions.has(defaultOutcome.status)) {
        return defaultSlashCommandDescriptions.get(defaultOutcome.status)!(defaultOutcome);
    } else return defaultSlashCommandDescriptions.get(OutcomeStatus.FAIL_UNKNOWN)!(defaultOutcome);
};

const tournamentsSlashCommandReplyer = async (interaction: CommandInteraction): Promise<void> => {
    const describedOutcome = await tournamentsSlashCommandOutcomeDescriber(limitCommandInteraction(interaction));
    interaction.reply({ content: describedOutcome.userMessage, ephemeral: describedOutcome.ephemeral });
};

const TournamentsCommand = new CustomCommand(
    new SlashCommandBuilder()
        .setName('tournaments')
        .setDescription('Show the tournaments happening in the server.')
        .addBooleanOption(option => option.setName('contestantview').setDescription('Judges can use True to only show visible tournaments, to see what a contestant sees.').setRequired(false)) as SlashCommandBuilder,
    async (interaction: CommandInteraction) => {
        await tournamentsSlashCommandReplyer(interaction);
    }
);

export default TournamentsCommand;