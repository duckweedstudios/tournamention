import { EmbedBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { GuildMember, PermissionsBitField } from 'discord.js';
import { getTournamentByName } from '../../backend/queries/tournamentQueries.js';
import { ValueOf } from '../../types/typelogic.js';
import { OutcomeStatus, Outcome, LimitedCommandInteraction, OptionValidationErrorOutcome, Constraint, OptionValidationErrorStatus, LimitedCommandInteractionOption, validateConstraints, OptionValidationError, SlashCommandDescribedOutcome, SimpleRendezvousSlashCommand, SlashCommandEmbedDescribedOutcome } from 'discord-rendezvous';
import ImportChallenges from '../../backend/functions/importChallenges.js';
import { LimitedAttachment } from 'discord-rendezvous/dist/rendezvous/limitedCommandInteraction.js';
import { getJudgeByGuildIdAndMemberId } from '../../backend/queries/profileQueries.js';

/**
 * Alias for the first generic type of the command.
 */
type T1 = number;

/**
 * Alias for the second generic type of the command.
 */
type T2 = string;

/**
 * Status codes specific to this command.
 */
enum ImportChallengesSpecificStatus {
    SUCCESS_CHALLENGES_IMPORTED = 'SUCCESS_CHALLENGES_IMPORTED',
}

/**
 * Union of specific and generic status codes.
 */
type ImportChallengesStatus = ImportChallengesSpecificStatus | OutcomeStatus;

/**
 * The outcome format for the specific status code(s).
 */
type ImportChallengesSpecificOutcome = {
    status: ImportChallengesSpecificStatus.SUCCESS_CHALLENGES_IMPORTED;
    body: {
        data1: T1;
        context1: string;
        data2: T2;
        context2: string;
    };
}

/**
 * Union of specific and generic outcomes.
 */
type ImportChallengesOutcome = Outcome<T1, T2, ImportChallengesSpecificOutcome>;

/**
 * Parameters for the solver function, as well as the "S" generic type.
 */

interface ImportChallengesSolverParams {
    guildId: string,
    challengesFileUrl: string,
    tournamentName: string,
}

/**
 * Imports challenges into a tournament.
 * @param params The parameters object for the solver function.
 * @returns A `ImportChallengesOutcome`, in all cases.
 */
const importChallengesSolver = async (params: ImportChallengesSolverParams): Promise<ImportChallengesOutcome> => {
    try {
        const tournament = await getTournamentByName(params.guildId, params.tournamentName);

        const challengesCount = await new ImportChallenges(params.guildId, tournament!, params.challengesFileUrl).Execute();

        return {
            status: ImportChallengesSpecificStatus.SUCCESS_CHALLENGES_IMPORTED,
            body: {
                data1: challengesCount,
                context1: 'challenges',
                data2: tournament!.name,
                context2: 'tournament',
            }
        };
    } catch (err) {
        // No expected thrown errors
    }

    return {
        status: OutcomeStatus.FAIL_UNKNOWN,
        body: {},
    };
};

const importChallengesSlashCommandValidator = async (interaction: LimitedCommandInteraction): Promise<ImportChallengesSolverParams | OptionValidationErrorOutcome<T1>> => {
    const guildId = interaction.guildId!;

    const metadataConstraints = new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([
        ['member', [
            // Ensure that the sender is an Administrator
            // {
            //     category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
            //     func: async function(metadata: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
            //         return (metadata as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator);
            //     },
            // },
            // TODO: Decide on proper permission level for this command
            // Ensure that the sender is a Judge or Administrator
            {
                category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                func: async function(metadata: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                    const judge = await getJudgeByGuildIdAndMemberId(guildId, (metadata as GuildMember).id);
                    return (judge && judge.isActiveJudge) || (metadata as GuildMember).permissions.has(PermissionsBitField.Flags.Administrator);
                },
            },
        ]],
    ]);

    const challengesFile = interaction.options.get('file', true);
    const tournament = interaction.options.get('tournament', true);

    const optionConstraints = new Map<LimitedCommandInteractionOption | null, Constraint<ValueOf<LimitedCommandInteractionOption>>[]>([
        [tournament, [
            // Ensure that the tournament exists
            {
                category: OptionValidationErrorStatus.OPTION_DNE,
                func: async function(option: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                    const tournamentDocument = await getTournamentByName(guildId, option as string);
                    return tournamentDocument !== null;
                }
            },
        ]],
        [challengesFile, [
            // Ensure the file has the name challenges.csv
            {
                category: OptionValidationErrorStatus.OPTION_INVALID,
                func: async function(option: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                    // const fileExtensionRegex = /(?:\.([^.]+))?$/;
                    // const fileName = fileExtensionRegex.exec(option as string)![0];
                    // const fileExtension = fileExtensionRegex.exec(option as string)![1];
                    // return fileExtension === 'csv';
                    return (option as LimitedAttachment).name === 'challenges.csv';
                }
            }
        ]],
    ]);

    try {
        await validateConstraints(interaction, metadataConstraints, optionConstraints);
    } catch (err) {
        if (err instanceof OptionValidationError) return ({
            status: OutcomeStatus.FAIL_VALIDATION,
            body: {
                constraint: err.constraint,
                field: err.field,
                value: err.value,
                context: err.message,
            },
        });

        throw err;
    }

    return {
        guildId: guildId,
        challengesFileUrl: challengesFile.attachment!.url,
        tournamentName: tournament.value as string,
    };
};

const importChallengesSlashCommandDescriptions = new Map<ImportChallengesStatus, (o: ImportChallengesOutcome) => SlashCommandDescribedOutcome | SlashCommandEmbedDescribedOutcome>([
    [ImportChallengesSpecificStatus.SUCCESS_CHALLENGES_IMPORTED, (o: ImportChallengesOutcome) => {
        const oBody = (o as ImportChallengesSpecificOutcome).body;
        // return {
        //     userMessage: `✅ ${oBody.data1} challenges were imported to tournament **${oBody.data2}**.`, ephemeral: true,
        // };
        return {
            embeds: [new EmbedBuilder()
                .setTitle('Challenges Imported')
                .setDescription(`✅ ${oBody.data1} challenges were imported to tournament **${oBody.data2}**.`)
                .setColor(0x00FF00)
                .toJSON()
            ],
            ephemeral: true,
        } as SlashCommandEmbedDescribedOutcome;
    }],
    [OutcomeStatus.FAIL_VALIDATION, (o: ImportChallengesOutcome) => {
        const oBody = (o as OptionValidationErrorOutcome<T1>).body;
        if (oBody.constraint.category === OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS) return {
            userMessage: `❌ You do not have permission to use this command.`, ephemeral: true,
        };
        else if (oBody.constraint.category === OptionValidationErrorStatus.OPTION_DNE) return {
            userMessage: `❌ The ${oBody.field} **${oBody.value}** was not found.`, ephemeral: true,
        };
        else return {
            userMessage: `❌ This command failed due to a validation error.`, ephemeral: true,
        };
    }],
]);

const ImportChallengesCommand = new SimpleRendezvousSlashCommand<ImportChallengesOutcome, ImportChallengesSolverParams, T1, ImportChallengesStatus>(
    new SlashCommandBuilder()
        .setName('import-challenges')
        .setDescription('Upload an import file of challenges to a tournament. See Tournamention documentation for usage.')
        .addAttachmentOption(attachOption => attachOption
            .setName('file').setDescription('The file, named challenges.csv.').setRequired(true))
        .addStringOption(option => option.setName('tournament').setDescription('The tournament to import challenges to.').setRequired(true)) as SlashCommandBuilder,
    importChallengesSlashCommandDescriptions,
    importChallengesSlashCommandValidator,
    importChallengesSolver,
    true,
);

export default ImportChallengesCommand;