var express = require('express');
var router = express.Router();
const User = require("../models/user");
const Game = require("../models/game");
const Women = require("../models/women");
const Bet = require("../models/bet");
const DailyPoint = require("../models/dailyPoint")
const request = require('request');
const axios = require('axios');
const { getGameStatus, endRound } = require('../server/game')

const TOKEN = '7494067656:AAEy3-yiq3GzjaJY8VQyBdWgpuiRZ3wTjVo';
const flag = 0;

const fetchUserProfilePhotos = async (telegramId) => {
    try {
      const profilePhotosResponse = await axios.get(
        `https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos`,
        {
          params: {
            user_id: telegramId,
            limit: 1,
          },
        }
      );

      if (profilePhotosResponse.data.result.total_count > 0) {
        const fileId = profilePhotosResponse.data.result.photos[0][0].file_id;

        // Get file path
        const fileResponse = await axios.get(
          `https://api.telegram.org/bot${TOKEN}/getFile`,
          {
            params: {
              file_id: fileId,
            },
          }
        );

        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        return fileUrl
      }
    } catch (error) {
      console.error('Error:', error);
    }
};

router.post('/loginUser', async function (req, res, next) {
    const username = req.body.username;
    const telegramId = req.body.telegramId;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const activeGame = await Game.getActiveGame(); 
    const activeRound = await Game.getCurrentRound();
    const womens = await Women.getAllWomens(); //get women info
    const gameStatus = await getGameStatus(); //get game status
    let bets = [];

    if(telegramId) {
      try {
        var userData = await User.findByTelegramId(telegramId);
        if(userData != null) 
        {
          bets = await Bet.getUserBets(activeGame.gameId, activeRound == null ? activeGame.roundNum : activeRound.roundNum,userData._id)
          res.send({
            info: { userInfo : userData, gameStatus : gameStatus, bets: bets, womens:womens},
            error: '',
          });
        }
        else{
            const createdUser = await User.addUser({username, telegramId, first_name, last_name});
            var imgUrl = await fetchUserProfilePhotos(createdUser.telegramId);
            var base64String = "";
            var response;
            if(imgUrl != null)
            {
              response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
              base64String = response.data.toString('base64');
            }
            const updatedUser = await User.setAvatar(createdUser._id, base64String);
            if(updatedUser == null) res.send({ info: null, error: 'Server error.'});
            else {
                res.send({
                  info: { userInfo : updatedUser, gameStatus : gameStatus, bets: bets, womens:womens},
                  error: ''
                });
            }
        }
      }
      catch(err) {
        console.log('error ===> ', err)
        res.send({info: null, error: "Server error."})
      }
    }
    else {
      res.send({info: null, error: "Bad request."})
    }
});

router.get('/setTopPick', async function (req, res) {
  try {
    const activeRound = await Game.getActiveGame();
    if (activeRound.roundNum == 1) {
      const womenId = req.query.womenId;
      const id = req.query.id;
      var userData = await User.setTopPick(id,womenId);
      if(userData == null) 
          res.send({ info: null, error: "User not found!"});
      else
          res.send({ info: userData, error: '' });
    }
  }
  catch(err) {
    console.error("set top pick error: ", err)
    res.send({ info: null, error: 'Server error.'})
  }
});

router.get('/getPoint', async function(req, res, next){
  try{
    const id = req.query.id;
    const userPoints = await User.getPointsById(id);
    res.send({info: userPoints, error: null})
  }
  catch(err){
    console.log('getPoint error ===> ', err)
    res.send({info: null, error: "Server error."})
  }
});

router.post('/getLeaders', async function (req,res){
  try {
    const periodType = req.body.periodType;
    const returnData = await DailyPoint.getLeaders(periodType);
    for(var i=0;i<returnData.length;i++){
      for(var j=i+1;j<returnData.length;j++){
        if(returnData[i].points < returnData[j].points){
          var name = returnData[i].userName;
          var point = returnData[i].points;
          var avatar = returnData[i].avatar;
          returnData[i].userName = returnData[j].userName;
          returnData[i].points = returnData[j].points;
          returnData[i].avatar = returnData[j].avatar;
          returnData[j].userName = name;
          returnData[j].points = point;
          returnData[j].avatar = avatar;
        }
      }
    }
    res.send({info:returnData,error:null});
  }
  catch(err) {
    console.log("get leaders api error: ", err);
    res.send({info: null, error: 'Get Leaders error'});
  }
});

router.get('/getRoundResult', async function(req, res, next){
  try{
    flag = 0;
    const gameStatus = await getGameStatus(); //get game status
    console.log(gameStatus);
    res.send({info: gameStatus, error: null})
  }
  catch(err){
    console.log('getRoundResult error ===> ', err)
    res.send({info: null, error: "Server error."})
  }
});

router.get('/finishRound', async function(req, res, next){
  try{
    if(flag == 0)
    {
      endRound();
      flag = 1;
    }
    res.send({info: "Success", error: null})
  }
  catch(err){
    console.log('finishRound error ===> ', err)
    res.send({info: null, error: "Server error."})
  }
});

router.post('/updatePoints', async function (req, res) {
  try {
    const id = req.body.id;
    const points = req.body.points;
    const returnData = await User.updatePoints(id, points);
    res.send({info: returnData, error: ''});
  }
  catch(err) {
    console.log("update point api error: ", err);
    res.send({info: null, error: 'Update Points error'});
  }
});

router.post('/bet', async function (req, res) {
  try {
    const userId = req.body.userId;
    const womenId = req.body.womenId;
    const match = req.body.match;
    const points = req.body.points;
    const activeRound = await Game.getCurrentRound();
    const userPoints = await User.getPointsById(userId);
    if(userPoints < points) {
      res.send({info: null, error: 'Bad request!'});
      return;
    }
    const searchData = await Bet.getBet(userId,activeRound.gameId,activeRound.roundNum,match);
    if(searchData == null) 
      await Bet.newBet(userId, activeRound.gameId, activeRound.roundNum, match, womenId, points);
    else 
      await Bet.updateBet(userId, activeRound.gameId, activeRound.roundNum, match, womenId, points);
    const returnData = await Bet.getUserBets(activeRound.gameId, activeRound.roundNum,userId)
    const updatedPoints = await User.getPointsById(userId);
    res.send({ 
      info: {
        points:updatedPoints,
        bets:returnData
      }, 
      error: ''}
    );
  }
  catch(err) {
    console.log("bet api error: ", err);
    res.send({info: null, error: err})
  }
});

module.exports = router;