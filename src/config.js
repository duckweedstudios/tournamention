const config = {
    'featureFlags': {
        'privacyMode': false
    },
    // The following character limits are required to ensure Discord embed messages have permissible
    // lengths. These should not be changed.
    'fieldCharacterLimits': {
        'challengeName': 40,
        'challengeDescription': 300,
        'game': 30,
        'tournamentName': 45,
        'proofLink': 200,
    },
    'pagination': {
        'challengesPerPage': 10,
        'pendingSubmissionsPerPage': 14,
    }
};

export default config;