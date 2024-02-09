import { ALWAYS_OPTION_CONSTRAINT, Constraint, validateConstraints } from '../../../src/commands/architecture/validation.js';
import { LimitedCommandInteraction, LimitedCommandInteractionOption, LimitedGuildMember } from '../../../src/types/limitedCommandInteraction.js';
import { ValueOf } from '../../../src/types/typelogic.js';
import { ApplicationCommandOptionType } from 'discord.js';
import { OptionValidationError, OptionValidationErrorStatus } from '../../../src/types/customError.js';
import { assert } from 'chai';

const getTrue = async () => true;

describe('Command Validation', () => {
    describe('validateConstraints', () => {
        it('Should accept a valid interaction', async () => {
            const memberMock = { id: '1' } as LimitedGuildMember;
            const interactionMock = { member: memberMock, options: { get: (_name: string, _required: boolean) => ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String }) } } as LimitedCommandInteraction;
            const game = interactionMock.options.get('game', true);
            await validateConstraints(interactionMock,
                new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([
                    ['member', [
                        // Dummy constraint
                        {
                            category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                            func: async function(_: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                                return getTrue();
                            },
                        },
                    ]],
                    ['commandId', [
                        // Dummy constraint 2
                        {
                            category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                            func: async function(_: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                                return getTrue();
                            },
                        },
                    ]],
                ]),
                new Map<LimitedCommandInteractionOption | null | ALWAYS_OPTION_CONSTRAINT, Constraint<ValueOf<LimitedCommandInteractionOption>>[]>([
                    [game, [
                        {
                            category: OptionValidationErrorStatus.OPTION_TOO_LONG,
                            func: async function(_: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                                return getTrue();
                            },
                        },
                    ]],
                    ['ALWAYS_OPTION_CONSTRAINT', [
                        {
                            category: OptionValidationErrorStatus.OPTION_TOO_LONG,
                            func: async function(_: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                                return getTrue();
                            },
                        },
                    ]],
                ]),
            );
        });
        it('Should reject an interaction that fails a metadata constraint', async () => {
            const memberMock = { id: '1' } as LimitedGuildMember;
            const interactionMock = { member: memberMock, guildId: '101', options: { get: (_name: string, _required: boolean) => ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String }) } } as LimitedCommandInteraction;
            const game = interactionMock.options.get('game', true);
            try {
                await validateConstraints(interactionMock,
                    new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([
                        ['member', [
                            // Dummy constraint
                            {
                                category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                                func: async function(_: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                                    return getTrue();
                                },
                            },
                        ]],
                        ['guildId', [
                            // Dummy constraint 2
                            {
                                category: OptionValidationErrorStatus.OPTION_INVALID,
                                func: async function(metadata: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                                    return metadata === game.value;
                                },
                            },
                        ]],
                    ]),
                    new Map<LimitedCommandInteractionOption | null | ALWAYS_OPTION_CONSTRAINT, Constraint<ValueOf<LimitedCommandInteractionOption>>[]>([
                        [game, [
                            {
                                category: OptionValidationErrorStatus.OPTION_TOO_LONG,
                                func: async function(_: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                                    return getTrue();
                                },
                            },
                        ]],
                        ['ALWAYS_OPTION_CONSTRAINT', [
                            {
                                category: OptionValidationErrorStatus.OPTION_TOO_LONG,
                                func: async function(_: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                                    return getTrue();
                                },
                            },
                        ]],
                    ]),
                );
            } catch (error) {
                const err = error as OptionValidationError<string>;
                assert.instanceOf(err, OptionValidationError);
                assert.strictEqual(err.constraint.category, OptionValidationErrorStatus.OPTION_INVALID);
                assert.strictEqual(err.field, 'guildId');
                assert.strictEqual(err.value, '101');
                return;
            }
            assert.fail('Expected an OptionValidationError to be thrown.');
        });
        it('Should reject an interaction that fails an option constraint', async () => {
            const memberMock = { id: '1' } as LimitedGuildMember;
            const interactionMock = { member: memberMock, options: { get: (_name: string, _required: boolean) => ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String }) } } as LimitedCommandInteraction;
            const game = interactionMock.options.get('game', true);
            try {
                await validateConstraints(interactionMock,
                    new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([
                        ['member', [
                            // Dummy constraint
                            {
                                category: OptionValidationErrorStatus.INSUFFICIENT_PERMISSIONS,
                                func: async function(_: ValueOf<LimitedCommandInteraction>): Promise<boolean> {
                                    return getTrue();
                                },
                            },
                        ]],
                    ]),
                    new Map<LimitedCommandInteractionOption | null | ALWAYS_OPTION_CONSTRAINT, Constraint<ValueOf<LimitedCommandInteractionOption>>[]>([
                        ['ALWAYS_OPTION_CONSTRAINT', [
                            {
                                category: OptionValidationErrorStatus.OPTION_TOO_LONG,
                                func: async function(_: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                                    return getTrue();
                                },
                            },
                        ]],
                        [game, [
                            {
                                category: OptionValidationErrorStatus.OPTION_TOO_LONG,
                                func: async function(option: ValueOf<LimitedCommandInteractionOption>): Promise<boolean> {
                                    return option === 'foo';
                                },
                            },
                        ]],
                    ]),
                );
            } catch (error) {
                const err = error as OptionValidationError<string>;
                assert.instanceOf(err, OptionValidationError);
                assert.strictEqual(err.constraint.category, OptionValidationErrorStatus.OPTION_TOO_LONG);
                assert.strictEqual(err.field, 'whatever');
                assert.strictEqual(err.value, 'asdf');
                return;
            }
            assert.fail('Expected an OptionValidationError to be thrown.');
        });
        it('Should accept empty constraint maps', async () => {
            const memberMock = { id: '1' } as LimitedGuildMember;
            const interactionMock = { member: memberMock, options: { get: (_name: string, _required: boolean) => ({ name: 'whatever', value: 'asdf', type: ApplicationCommandOptionType.String }) } } as LimitedCommandInteraction;
            await validateConstraints(interactionMock,
                new Map<keyof LimitedCommandInteraction, Constraint<ValueOf<LimitedCommandInteraction>>[]>([]),
                new Map<LimitedCommandInteractionOption | null | ALWAYS_OPTION_CONSTRAINT, Constraint<ValueOf<LimitedCommandInteractionOption>>[]>([]),
            );
        });
    });
});