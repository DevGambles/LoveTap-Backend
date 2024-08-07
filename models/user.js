const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
  },
  telegramId: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
  },
  top_pick: {
    type: Number,
  },
  votes: {
    type: [Number],
    validate: [arrayLimit, '{PATH} exceeds the limit of 32']
  },
  avatar: {
    type: String,
  }
});

function arrayLimit(val) {
  return val.length <= 32;
}

userSchema.statics.getAllUsers = async function(){
  try{
    return await this.find({}).exec();
  }
  catch(err){
    console.log("getAllUsers error :",err);
    return;
  }
}

userSchema.statics.findById = async function(id){
  try {
    const filter = { _id: id };
    return await this.findOne(filter).exec();
  }
  catch(err) {
    console.error('setTopPick error :', err)
  }
}
userSchema.statics.findByTelegramId = async function(telegramId) {
  try {
    return await this.findOne({ telegramId: telegramId }).exec();
  }
  catch(err) {
    console.log("findByTelegramId error :", err);
    return;
  }
};

userSchema.statics.getPointsById = async function(id){
  try {
    return await this.findOne({ _id: id }).exec().then((user) => user ? user.points : null);
  }
  catch(err) {
    console.log("getPointsById error :", err);
    return;
  }
  
};

userSchema.statics.addUser =async function(data) {
  try {
    const user = {
      "username" : data.username,
      "telegramId": data.telegramId,
      "first_name": data.first_name,
      "last_name": data.last_name,
      "points": 100,
      "top_pick": 0,
      "vote_data": [],
      "avatar": ""
    };
    
    const createdUser = await this.create(user);
    return createdUser;
  }
  catch(err) {
    console.log("new user create error:", err)
  }
};

userSchema.statics.setAvatar = async function(id, avatar){
  try {
    const filter = { _id: id };
    const updateDoc = {
      $set: {
        avatar : avatar
      },
    };
    return await this.findOneAndUpdate(filter, updateDoc, { new: true }).exec();
  }
  catch(err) {
    console.error("")
  }
};

userSchema.statics.setTopPick = async function(id, womenId){
  try {
    const filter = { _id: id };
    const updateDoc = {
      $set: {
        top_pick : womenId
      },
    };
    return await this.findOneAndUpdate(filter, updateDoc, { new: true }).exec();
  }
  catch(err) {
    console.error('setTopPick error :', err)
  }
};

userSchema.statics.updatePoints = async function(id, points){
  try {
    const filter = { _id: id }; 
    const updateDoc = {
      $set: {
        points : points
      },
    };
    return await this.findOneAndUpdate(filter, updateDoc, { new: true }).exec();
  }
  catch(err) {
    console.error("update points error:", err)
  }
};

userSchema.statics.addPoints = async function(id, add_points) {
  try {
    const filter = { _id: id }; 
    const updateDoc = {
      $inc: {
        points : add_points
      },
    };
    return await this.findOneAndUpdate(filter, updateDoc, { new: true }).exec();
  }
  catch(err) {
    console.error("add points error:", err)
  }
}

userSchema.statics.removePoints = async function(id, points) {
  try {
    const filter = { _id: id };
    const updateDoc = {
      $inc: { points: -points }
    };
    return await this.findOneAndUpdate(filter, updateDoc, { new: true }).exec();
  }
  catch(err) {
    console.error("removePoints error: ", err);
  }
};

userSchema.statics.topPickWinnerAward = async function(topPick) {
  try {
    await this.updateMany({top_pick: topPick}, { $inc: {points: 1000000}}).exec;
  }
  catch(err) {
    console.log("calculting award for top pick winners raised error: ", err);
  }
}

const User = mongoose.model('User', userSchema);

module.exports = User;