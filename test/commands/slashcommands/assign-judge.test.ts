import { ApplicationCommandOptionType, PermissionsBitField } from 'discord.js';
import { LimitedCommandInteraction, LimitedCommandInteractionOption, LimitedGuildMember, LimitedUser } from '../../../src/types/limitedCommandInteraction.js';
import AssignJudgeSlashCommand from '../../../src/commands/slashcommands/assign-judge.js';
import { OptionValidationErrorOutcome, OutcomeStatus, isValidationErrorOutcome } from '../../../src/types/outcome.js';
import { assert } from 'chai';
import { OptionValidationErrorStatus } from '../../../src/types/customError';
import { ValueOf } from '../../../src/types/typelogic.js';

describe('/assign-judge', () => {
    describe('Validator', () => {
        const adminPermissions = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
        const lesserPermissions = new PermissionsBitField([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.UseApplicationCommands]);
        const adminMemberMock = { id: '1', permissions: adminPermissions } as LimitedGuildMember;
        const lesserMemberMock = { id: '2', permissions: lesserPermissions } as LimitedGuildMember;
        it('Should accept when used by an Administrator', async () => {
            // Overload the get method to match the real signature (required and optional options) so can purposefully leave out the "revoke" option
            function get(name: string, required: boolean): LimitedCommandInteractionOption;
            function get(name: string, required?: boolean | undefined): LimitedCommandInteractionOption | null;
            function get(name: string, required?: boolean | undefined): LimitedCommandInteractionOption | null {
                if (required) {
                    if (name === 'who') return { name: 'who', user: { id: '99', bot: false }, type: ApplicationCommandOptionType.User };
                    else return ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String });
                }
                return { name: 'optionalWhatever', value: false, type: ApplicationCommandOptionType.Boolean };
            }
            const interactionMock = { member: adminMemberMock, guildId: '101', options: { get } } as LimitedCommandInteraction;
            const solverParamsOrValidationErrorOutcome = await AssignJudgeSlashCommand.validator(interactionMock);
            if (isValidationErrorOutcome(solverParamsOrValidationErrorOutcome)) {
                assert.fail();
            } else {
                const solverParams = solverParamsOrValidationErrorOutcome as Parameters<typeof AssignJudgeSlashCommand.solver>[0];
                assert.deepEqual(solverParams, { guildId: '101', memberId: '99', revoke: false });
            }
        });
        it('Should revoke when the "revoke" option is present', async () => {
            // Overloading get here again would be correct but is unnecessary (since we are using the revoke option) thus skipped
            const get = (name: string, _required: boolean) => {
                if (name === 'who') return { name: 'who', user: { id: '99', bot: false }, type: ApplicationCommandOptionType.User };
                else if (name === 'revoke') return { name: 'revoke', value: true, type: ApplicationCommandOptionType.Boolean };
                else return { name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String };
            };
            const interactionMock = { member: adminMemberMock, guildId: '101', options: { get } } as LimitedCommandInteraction;
            const solverParamsOrValidationErrorOutcome = await AssignJudgeSlashCommand.validator(interactionMock);
            if (isValidationErrorOutcome(solverParamsOrValidationErrorOutcome)) {
                assert.fail();
            } else {
                const solverParams = solverParamsOrValidationErrorOutcome as Parameters<typeof AssignJudgeSlashCommand.solver>[0];
                assert.deepEqual(solverParams, { guildId: '101', memberId: '99', revoke: true });
            }
        });
        it('Should reject when used by a non-Administrator', async () => {
            // Overload the get method to match the real signature (required and optional options) so can purposefully leave out the "revoke" option
            function get(name: string, required: boolean): LimitedCommandInteractionOption;
            function get(name: string, required?: boolean | undefined): LimitedCommandInteractionOption | null;
            function get(name: string, required?: boolean | undefined): LimitedCommandInteractionOption | null {
                if (required) {
                    if (name === 'who') return { name: 'who', user: { id: '99', bot: false }, type: ApplicationCommandOptionType.User };
                    else return ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String });
                }
                return { name: 'optionalWhatever', value: false, type: ApplicationCommandOptionType.Boolean };
            }
            const interactionMock = { member: lesserMemberMock, guildId: '101', options: { get } } as LimitedCommandInteraction;
            const solverParamsOrValidationErrorOutcome = await AssignJudgeSlashCommand.validator(interactionMock);
            if (isValidationErrorOutcome(solverParamsOrValidationErrorOutcome)) {
                const validationErrorOutcome = solverParamsOrValidationErrorOutcome as OptionValidationErrorOutcome<ValueOf<LimitedCommandInteractionOption>>;
                assert.equal(validationErrorOutcome.status, OutcomeStatus.FAIL_VALIDATION);
                assert.equal(validationErrorOutcome.body.constraint.category, OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS);
                assert.equal(validationErrorOutcome.body.field, 'member');
                assert.equal((validationErrorOutcome.body.value as LimitedUser).id, lesserMemberMock.id);
            } else {
                assert.fail();
            }
        });
        it('Should reject when the target is a bot', async () => {
            // Overload the get method to match the real signature (required and optional options) so can purposefully leave out the "revoke" option
            function get(name: string, required: boolean): LimitedCommandInteractionOption;
            function get(name: string, required?: boolean | undefined): LimitedCommandInteractionOption | null;
            function get(name: string, required?: boolean | undefined): LimitedCommandInteractionOption | null {
                if (required) {
                    if (name === 'who') return { name: 'who', user: { id: '99', bot: true }, type: ApplicationCommandOptionType.User };
                    else return ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String });
                }
                return { name: 'optionalWhatever', value: false, type: ApplicationCommandOptionType.Boolean };
            }
            const interactionMock = { member: adminMemberMock, guildId: '101', options: { get } } as LimitedCommandInteraction;
            const solverParamsOrValidationErrorOutcome = await AssignJudgeSlashCommand.validator(interactionMock);
            if (isValidationErrorOutcome(solverParamsOrValidationErrorOutcome)) {
                const validationErrorOutcome = solverParamsOrValidationErrorOutcome as OptionValidationErrorOutcome<ValueOf<LimitedCommandInteractionOption>>;
                assert.equal(validationErrorOutcome.status, OutcomeStatus.FAIL_VALIDATION);
                assert.equal(validationErrorOutcome.body.constraint.category, OptionValidationErrorStatus.TARGET_USER_BOT);
                assert.equal(validationErrorOutcome.body.field, 'who');
                assert.equal((validationErrorOutcome.body.value as LimitedUser).id, '99');
            } else {
                assert.fail();
            }
        });
    });
});