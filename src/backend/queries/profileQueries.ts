import { ContestantDocument } from '../../types/customDocument.js';
import { ContestantModel } from '../schemas/contestant.js';

// CREATE / POST
export const createContestant = async (guildId: string, memberId: string): Promise<ContestantDocument> => {
    return ContestantModel.create({
        guildID: guildId,
        userID: memberId,
    });
};

// READ / GET
/**
 * Gets or creates a Contestant document. Every Discord member who uses a contestant feature is a Contestant.
 * However, being a Contestant may not be sufficient for participation in a Tournament; this depends on the
 * guild's and the Tournament's settings. For this reason, this endpoint can be used for any (well-formed)
 * app interaction involving a Contestant.
 * @param guildId The Discord guild ID.
 * @param memberId The Discord member ID.
 * @returns The new or existing Contestant document.
 */
export const getOrCreateContestant = async (guildId: string, memberId: string): Promise<ContestantDocument> => {
    const contestant = await ContestantModel.findOne({ guildID: guildId, userID: memberId });
    if (contestant) return contestant;
    else return createContestant(guildId, memberId);
};

// UPDATE / PUT

// DELETE