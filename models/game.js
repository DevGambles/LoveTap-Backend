const mongoose = require('mongoose');
const Bet = require('../models/bet');
const gameSchema = new mongoose.Schema({
  gameId: {
    type: Number,
  },
  roundNum: {
    type: Number,
  },
  roundStatus: {
    type: String,   //Active or InActive
  },
  matches: {
    type: [[Number]],
  },
  roundResult: {
    type: [Number],
  },
  startAt: {
    type: Number,
  },
  endAt:{
    type: Number,
  },
  roundStartAt: {
    type: Number,
  },
  status: {
    type: String,   //game status: preparing, In-progress, completed
  }
});

gameSchema.statics.isGameExists = async function () {
  try{
    const games = await this.find({}).exec();
    if(games.length > 0) return true;
    else return false;
  }
  catch(err){
    console.log("is game exists error: ", err)
  }
}

gameSchema.statics.getActiveGame = function () {
  try {
    return this.findOne({status: 'In-progress'}).exec()
  }
  catch(err) {
    console.log("get active game error: ", err)
  }
}

gameSchema.statics.getCurrentRound = function() {
  try {
    return this.findOne({roundStatus: 'Active', status: 'In-progress'}).exec()
  }
  catch(err) {
    console.log("get current round number error: ", err)
  }
}


gameSchema.statics.newGame = async function(gameId, matches, startAt, endAt) {
  const newGame = {
    "gameId": gameId,
    "roundNum": 1,
    "roundStatus": 'Active',
    "matches": matches,
    "roundResult": [],
    "startAt": startAt,
    "endAt": endAt,
    "roundStartAt": startAt,
    "status": 'In-progress',
  }
  
  try {
    if(gameId == 0)
      await this.deleteMany({}).exec();
    else{
      await this.updateMany({status: 'In-progress'}, { $set: {status: "Completed", roundStatus:"InActive"}}).exec()
    }
    const createdGame = await this.create(newGame);
    return createdGame;
  }
  catch(err) {
    console.log("init game error: ", err);
  }
}

gameSchema.statics.endGame = async function(gameId) {
  try{
    this.updateMany({gameId: gameId}, { $set: {status: "Completed", roundStatus:"InActive"}}).exec()
  }
  catch(err) {
    console.log("end game error: ", err)
  }
}

gameSchema.statics.newRound = async function(roundNum, matches, startAt) {
  const activeGame = await this.getActiveGame();
  const newRound = {
    "gameId": activeGame.gameId,
    "roundNum": roundNum,
    "roundStatus": 'Active',
    "matches": matches,
    "roundResult":[],
    "startAt": activeGame.startAt,
    "endAt": activeGame.endAt,
    "roundStartAt": startAt,
    "status": 'In-progress',
  }
  try {
    const createdRound = await this.create(newRound);
    return createdRound;
  }
  catch(err) {
    console.log("new round error: ", error)
  }
}

gameSchema.statics.endRound = async function(roundNum) {
  try {
    let winners = [];
    const activeGame = await this.getActiveGame();
    const round = await this.findOne({gameId: activeGame.gameId, roundNum: roundNum}).exec();
    await Promise.all(round.matches.map(async (match) => {
      let winner = -1;
      const w1_total_points = await Bet.aggregate([
        {
          $match: {
            gameId: activeGame.gameId,
            roundNum: roundNum,
            match: match,
            womenId: match[0],
          }
        },
        {
          $group: {
            _id: '$womenId', // Group by womenId
            totalSum: { $sum: '$points' }, // Sum the points field
          }
        }
      ]);

      const w2_total_points = await Bet.aggregate([
        {
          $match: {
            gameId: activeGame.gameId,
            roundNum: roundNum,
            match: match,
            womenId: match[1],
          }
        },
        {
          $group: {
            _id: '$womenId', // Group by womenId
            totalSum: { $sum: '$points' }, // Sum the points field
          }
        }
      ]);
      let totalpoint_1 = 0;
      let totalpoint_2 = 0;
      if(w1_total_points.length == 0){
        totalpoint_1 = 0;
      }
      else{
        totalpoint_1 = w1_total_points[0].totalSum;
      }
      if(w2_total_points.length == 0){
        totalpoint_2 = 0;
      }
      else{
        totalpoint_2 = w2_total_points[0].totalSum;
      }
      winner = match[0]; //default value(if the bet point is same, the first women will be winner)
      if(totalpoint_1 < totalpoint_2) winner = match[1];
      else winner = match[0];
      winners.push(winner);
    }));
    await this.updateOne({gameId: activeGame.gameId, roundNum: roundNum}, { $set: {roundResult: winners, roundStatus: "InActive"}}).exec();
    return winners;
  }
  catch(err) {
    console.log("close round error: ", err);
  }
}

gameSchema.statics.getRound = async function(gameId, roundNum) {
  try {
    return this.findOne({ gameId: gameId, roundNum: roundNum}).exec();
  }
  catch(err) {
    console.log("getting round info error: ", err)
  }
}

gameSchema.statics.getAllRounds = async function(gameId) {
  try {
    return await this.find({gameId: gameId}).exec();
  }
  catch(err) {
    console.log("getting all rounds of the current game, error :", err);
  }
}

gameSchema.statics.activateGame = async function(){
  try {
    const activeGame = await this.getActiveGame();
    if(activeGame) {
      this.updateOne({gameId: activeGame.gameId, roundNum: 1}, { $set: {status: "In-progress", roundStatus:"Active"}}).exec();
    }
  }
  catch(err) {
    console.log("update round status error: ", err);
  }
}

gameSchema.statics.activateRound = async function(roundNum) {
  try {
    const activeGame = await this.getActiveGame();
    if(activeGame) this.updateOne({gameId: activeGame.gameId, roundNume: roundNum}, { $set: {roundStatus: 'Active'}}).exec();
  }
  catch(err) {
    console.log('active round error: ', err);
  }
}

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;