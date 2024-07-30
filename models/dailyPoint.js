const mongoose = require('mongoose');
const User = require("../models/user");

const dailyPointSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  date: {
    type: Number,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  }
});


dailyPointSchema.statics.bulkInput = async function(date) {
  try {
    const users = await User.getAllUsers();
    for(var i=0;i<users.length;i++){
      const newData = {
        "userId": users[i].telegramId,
        "date" : date,
        "points": users[i].points,
      };
      await this.create(newData);
    }
  }
  catch(err) {
    console.log("daily points error: ", err);
  }
}

dailyPointSchema.statics.getLeaders = async function(periodType){
  try {
    const now = new Date();
    let dailyStart = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const users = await User.getAllUsers();
    let returnData = [];
    var dayInterval = 24 * 40 * 60 * 1000;
    var spendDays = 0;
    if(periodType == 0) spendDays = 1;
    else if(periodType == 1) spendDays = 7;
    else if(periodType == 2) spendDays = 30;
    dailyStart -= spendDays * dayInterval;
    for(var i=0;i<(users.length > 100 ? 100 : users.length );i++){
      const data = await this.findOne({userId: users[i].telegramId, date: dailyStart}).exec();
      let userItem = {
        userName: users[i].username,
        points: users[i].points - ( data == null ? 0 : data.points),
        avatar: users[i].avatar,
      }
      returnData.push(userItem);
    }
    return returnData;
  }
  catch(err) {
    console.log("daily points error: ", err);
  }
}
const DailyPoint = mongoose.model('DailyPoint', dailyPointSchema);

module.exports = DailyPoint;