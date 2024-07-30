const mongoose = require('mongoose');
const User = require("../models/user");
const { ObjectId } = require('mongodb');

const betSchema = new mongoose.Schema({
  userId: {
    type: ObjectId,
    required: true,
  },
  gameId: {
    type: Number,
    required: true,
  },
  roundNum: {
    type: Number,
    required: true,
  },
  match: {
    type: [Number],
    required: true,
  },
  womenId: {
    type: Number,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  result: {
    type: Number,
  }
});

betSchema.statics.clearBet = async function(){
  await this.deleteMany({}).exec();
}

betSchema.statics.getBet = async function(userId, gameId, roundNum, match){
  const filter = {
    userId: userId,
    gameId: gameId,
    roundNum: roundNum,
    match: match,
  }

  try {
    const result = await this.findOne(filter).exec();
    return result;
  }
  catch(err) {
    console.log("get bet error: ", getBet)
  }
};

betSchema.statics.newBet = async function(userId, gameId, roundNum, match, womenId, points) {
  try {
    const bet ={
      "userId" : userId,
      "gameId": gameId,
      "roundNum": roundNum,
      "match": match,
      "womenId": womenId,
      "points": points,
      "result": 0,
    };
    const updateUserInfo = await User.removePoints(userId, points);
    if(updateUserInfo) await this.create(bet);
    else console.log('User update failed');
  } catch (err) {
    console.error('Error add new bet:', err);
  }
};

betSchema.statics.updateBet = async function(userId, gameId, roundNum, match, womenId, points) {
  const filter = {
    userId: userId,
    gameId: gameId,
    roundNum: roundNum,
    match: match,
  }
  const updateDoc = {
    $set: {
      womenId: womenId,
      points: points,
    }
  }
  try {
    const searchData = await this.findOne(filter).exec();
    await User.addPoints(userId, searchData.points);
    await User.removePoints(userId, points);
    return this.findOneAndUpdate(filter, updateDoc, { new: true }).exec()
  }
  catch(err) {
    console.log("update bet error: ", updateBet)
  }
}

betSchema.statics.getBetHistory = function(userId, gameId, roundNum){
  const filter = {
    userId: userId,
    gameId: gameId,
    roundNum: roundNum,
  }
  try{
    return this.find(filter);
  }catch(err){
    console.error('get bet history error:', err);
  }
}

//no need for now
// betSchema.statics.updateBetResult = async function(gameId, roundNum, match, womenId) {
//   try {
//     const filter = {
//       gameId: gameId,
//       roundNum: roundNum,
//       match: match,
//     }
//     const winner_filter = {
//       roundNum: roundNum,
//       match: match,
//       womenId: womenId,
//     }
//     if(!match.flat().includes(womenId)) return console.log("bad request")
//     else { 
//       const bets = await this.find(filter)
//       const win_bets = await this.find(winner_filter)
//       if(bets.length > 0){
//         const bulkOps_1 = bets.map((bet) => ({
//           updateOne: {
//             filter: { _id: bet._id },
//             update: { $set: { result: -bet.points } }
//           }
//         }));
//         await this.bulkWrite(bulkOps_1);
//       }

//       if(win_bets.length > 0) {
//         const bulkOps_2 = win_bets.map((bet) => ({
//           updateOne: {
//             filter: { _id: bet._id },
//             update: { $set: { result: bet.points * 2 } }
//           }
//         }));
//         await this.bulkWrite(bulkOps_2)
//       }
//     }
//   }
//   catch(err) {
//     console.log("update bet error", err)
//   }
// }

betSchema.statics.calcBetResult = async function(gameId, roundNum, winners) {
  try {
    await this.updateMany({gameId: gameId, roundNum: roundNum, womenId: { $in: winners}}, [{$set: { result: {$multiply: ["$points", 2]}}}]).exec()
    const bets = await this.find({
      gameId: gameId,
      roundNum: roundNum,
      womenId: { $in: winners }
    });
    //calculate result points
    for (const bet of bets) {
      const userId = bet.userId;
      const prize_points = bet.points * 2;
      
      // Add points to user
      const returnData = await User.addPoints(userId, prize_points);
    }

  }
  catch(err) {
    console.log("bet calculation failed: ", err);
  }
}

betSchema.statics.getUserBets = async function(gameId, roundId, userId) {
 try {
  return await this.find({gameId: gameId,roundNum:roundId,userId: userId}).exec();
 }
 catch(err) {
  console.log("getting user bets error: ", err);
 }
}

const Bet = mongoose.model('Bet', betSchema);

module.exports = Bet;