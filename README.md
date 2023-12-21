![tournamention-wide](https://github.com/duckweedstudios/tournamention/assets/57969507/131439c2-cb2c-4eea-b3fb-3166dab6cc6e)
# tournamention
Organize and run your own gaming challenges for friends to complete with this Discord.js bot.

## Developer Setup
Prerequisites:
- [Node.js](https://nodejs.org/en/)
- [Git](https://git-scm.com/downloads)
- [VSCode](https://code.visualstudio.com/download)
- [MongoDB](https://www.mongodb.com/try/download/community) (recommended)
- [MongoDB Compass](https://www.mongodb.com/try/download/compass) (recommended) or another MongoDB GUI

1. **Clone the repository**: in a terminal (e.g. Git bash)
```
cd Documents
git clone https://github.com/duckweedstudios/tournamention.git
```
2. **Install dependencies**: in a terminal
```
cd tournamention
npm install
```
3. **Add VSCode extensions**: in VSCode, open the Extensions tab and install and/or enable the following extensions:
- ESLint
- Prettier
4. **Create a Discord bot** from the Discord Developer Portal
5. **Create a MongoDB database** called tournamentionDB locally or remotely on MongoDB Atlas
6. **Create a .env file** in the root directory of the project and add the following:
```
DISCORD_TOKEN=<your bot token>
```
7. **Run the bot**: in a terminal
```
npm start
```
