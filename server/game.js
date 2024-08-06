const User = require("../models/user")
const Women = require("../models/women")
const Bet = require("../models/bet")
const Game = require("../models/game")
const DailyPoint = require("../models/dailyPoint")
const { broadcastMessage } = require("./ably")

const roundPeriod = 30; //2 min per round
const prepareRoundPeriod = 0.5; //prepare round for 0.5 min

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateRandomMatches(womens) { // womens type: Array
  shuffleArray(womens); // Shuffle the array to randomize the women order
  
  const matches = [];
  for (let i = 0; i < womens.length; i += 2) {
    matches.push([womens[i], womens[i + 1]]);
  }
  
  return matches;
}

async function InitGame (startAt, matches) {
  console.log("Game Init");
  const startTime = startAt.getTime();
  const endTime = startTime + (roundPeriod * 5 + prepareRoundPeriod * 4) * 60 * 1000; //5: number of rounds
  await Game.newGame(0, matches, startTime, endTime);
  return;
}

async function saveDailyPoint(){
    const now = new Date();
    await DailyPoint.bulkInput(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime());
}

async function checkGameStatus(now, activeGame, activeRound){
    var returnData = "";
    const status = new Date();
    console.log("Checking Status: ", status.getTime());
    if(Math.abs(now.getTime() - activeRound.roundStartAt) <= 10000){
      returnData = {
        "msg":"Round Started",
        "endAt":roundPeriod,
        "roundId":activeRound.roundNum,
      };
      console.log("==============Round Started=================");
      return returnData;
    }
    if(Math.abs(now.getTime() - (activeRound.roundStartAt + roundPeriod * 60000)) < 10000){
      returnData = {
        "msg":"Round Ended",
        "endAt":prepareRoundPeriod,
        "roundId":activeRound.roundNum == 5 ? 1 : activeRound.roundNum + 1,
      };
      endRound(activeGame, activeRound);
      return returnData;
    }
    if(Math.abs(now.getTime() - (activeRound.roundStartAt - prepareRoundPeriod * 60000)) < 10000){
      console.log("==============Prepare Started=========")
      // returnData = {
      //   "msg":"Prepare Started",
      //   "endAt":prepareRoundPeriod,
      //   "roundId":activeRound.roundNum,
      // };
      return returnData;
    }
    return returnData;
}


async function endRound(activeGame, activeRound){
  const winners = await Game.endRound(activeRound.roundNum);
  if(activeRound.roundNum < 5) {
    //calculate the round result
    await Bet.calcBetResult(activeGame.gameId, activeGame.roundNum, winners);
    //end of calculation
    const newMatches = generateRandomMatches(winners);
    const nextStartTime = activeGame.startAt + activeRound.roundNum * (roundPeriod + prepareRoundPeriod) * 60 * 1000;
    await Game.newRound(activeRound.roundNum + 1, newMatches, nextStartTime);
    const returnvalue = await getGameStatus();
    returnData = {
      "msg":"New Round Data",
      "gamestatus": returnvalue,
      "roundResult": winners,
    };
    broadcastMessage(returnData);
    console.log("==========Round Ended===========");
  }
  else if(activeRound.roundNum == 5){
    //calculate the game result
    console.log("last winner:", winners[0])
    await Bet.calcBetResult(activeGame.gameId, 5, winners);
    await User.topPickWinnerAward(winners[0]);
    //end of calculation
    const newWomens = [...Array(32).keys()];
    const randomMatches = generateRandomMatches(newWomens);
    //will start in 2 min
    const willStart = activeGame.endAt + prepareRoundPeriod * 60 * 1000;
    console.log("next game will start in: ", willStart);
    const endAt = willStart + (roundPeriod * 5 + prepareRoundPeriod * 4) * 60 * 1000;
    await Game.newGame(activeGame.gameId + 1, randomMatches, willStart, endAt);
    const returnvalue = await getGameStatus();
    returnData = {
      "msg":"New Round Data",
      "gamestatus": returnvalue,
    };
    broadcastMessage(returnData);
    console.log("=============End Game================");
  }
}

async function getGameStatus() {
  let activeRound = await Game.getCurrentRound();
  let bets = await Bet.getUserBets(activeRound.gameId, activeRound.roundNum);
  const time = new Date().getTime();
  const gameStatus = {
    activeGameId: activeRound.gameId,
    activeRoundNum: activeRound.roundNum,
    matches: activeRound.matches, 
    endAt: roundPeriod * 60000 - ( time - activeRound.roundStartAt ),
    isPreparing: false,
  }
  if(time < activeRound.roundStartAt){
    gameStatus.isPreparing = true;
    gameStatus.endAt = activeRound.roundStartAt - time; 
  }
  return gameStatus;
}

module.exports = { InitGame, checkGameStatus, getGameStatus, generateRandomMatches, saveDailyPoint };