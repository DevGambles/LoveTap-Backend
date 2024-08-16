var express = require('express')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var WebSocket = require('ws')
var index = require('./routes/index')
var user = require('./routes/user');
var Game = require('./models/game');
var Bet = require('./models/bet')
const { InitGame, generateRandomMatches, saveDailyPoint } = require('./server/game')
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
//update
    let now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const womens = [...Array(32).keys()];

    const nextHalfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes + 2,0);  //after in 2 minutes
    await InitGame(nextHalfHour, generateRandomMatches(womens));

  })
  .catch((error) => console.error('Connection error', error));

app.use('/', index);
app.use('/user',user);

app.listen(4000, function () {
  console.log('Listening on port 4000...')
})
