import { CommandInteractionOptionResolver } from 'discord.js';

/**
 * An alias for the type of `interaction.options`.
 */
export type CommandInteractionOptionResolverAlias = Omit<
CommandInteractionOptionResolver,
| 'getMessage'
| 'getFocused'
| 'getMentionable'
| 'getRole'
| 'getAttachment'
| 'getNumber'
| 'getInteger'
| 'getString'
| 'getChannel'
| 'getBoolean'
| 'getSubcommandGroup'
| 'getSubcommand'
>;