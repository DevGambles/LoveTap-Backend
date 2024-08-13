var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var WebSocket = require('ws')
var index = require('./routes/index')
var user = require('./routes/user');
var Game = require('./models/game');
var Bet = require('./models/bet')
const { InitGame, generateRandomMatches, checkGameStatus, saveDailyPoint } = require('./server/game')
const cors = require('cors');

var app = express()

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors(corsOptions));

const mongoose = require('mongoose');
const dbURI = 'mongodb+srv://admin:stress@cluster0.yjagzxb.mongodb.net/lovetap';
console.log('connecting to mongo');
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () =>  {
    console.log('Connected to MongoDB');
    await Bet.clearBet();

    let now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const womens = [...Array(32).keys()];

    const nextHalfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours + 10, 0);  //after in 2 minutes
    
    await InitGame(nextHalfHour, generateRandomMatches(womens));

    let activeGame = await Game.getActiveGame();
    let activeRound = await Game.getCurrentRound();

    const nextTenMinutes = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes + 1,0);  //after in one minutes

    const delay = nextTenMinutes.getTime() - now.getTime();

    let nextDay = new Date(now);
    nextDay.setDate(now.getDate() + 1);
    nextDay.setHours(0,0,0,0);

    const nextDelay = nextDay.getTime() - now.getTime();

    console.log("will check in:", nextTenMinutes.getTime(), "delay: ", delay);
    
    setTimeout(async function() {
      now = new Date();
      await checkGameStatus(now, activeGame, activeRound);

      setInterval(async function() {
        now = new Date();
        console.log("30 seconds have passed.");
        activeGame = await Game.getActiveGame();
        activeRound = await Game.getCurrentRound();
        let rTxt = await checkGameStatus(now, activeGame, activeRound);
        // Add any additional logic or functionality you want to execute every 2 minutes
      }, 0.5 * 60 * 1000);
    }, delay);

    setTimeout(async function(){
      console.log("Next Day checkout");
      await saveDailyPoint();
      setInterval(async function(){
        await saveDailyPoint();
      }, 24 * 60 * 60 * 1000);
    },nextDelay)
  })
  .catch((error) => console.error('Connection error', error));

app.use('/', index);
app.use('/user',user);

app.listen(4000, function () {
  console.log('Listening on port 4000...')
})
