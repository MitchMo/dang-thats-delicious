const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slugs: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String]
});

storeSchema.pre('save', function(next) {

  if(!this.isModified('name')) {
    next(); //skip it
    return; //stop the function from running
  }

  this.slug = slug(this.name);
  next();

  //TODO: Make slugs more unique. In case two stores have the same name
});

module.exports = mongoose.model('Store', storeSchema);