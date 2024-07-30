const mongoose = require('mongoose');

const womenSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  age: {
    type: Number,
  },
  nationality: {
    type: String,
  },
  height: {
    type: Number,
  },
  bodyType: {
    type: String,
  },
  eyeColor: {
    type: String,
  },
  hiddenTalent: {
    type: String,
  },
  funFact: {
    type: String,
  }
});

womenSchema.statics.getNameById = async function(id){
  try {
    const women = await this.findOne({ _id: id });
    return women.name;
  } catch (err) {
    console.error('Error insert user:', err);
    throw err;
  }
}

womenSchema.statics.getAllWomens = async function(){
  try{
    const womens = await this.find({});
    const returnData = [];
    for(var i=0;i<womens.length;i++){
      const data = {
        id: womens[i].womenId,
        name: womens[i].name,
      }
      returnData.push(data);
    }
    return returnData;
  } catch(err){
    console.error('Error insert user:', err);
    throw err;
  }
}

const Women = mongoose.model('Women', womenSchema);

module.exports = Women;