const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'you must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author bitch!'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

storeSchema.pre('save', async function(next) {

  if(!this.isModified('name')) {
    next(); //skip it
    return; //stop the function from running
  }

  this.slug = slug(this.name);
  //find if any other stores have the same slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');

  const storesWithSlug = await this.constructor.find({slug: slugRegEx});

  if(storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  next();

  // TODO: Make slugs more unique. In case two stores have the same name
});

//Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({
  location: '2dsphere'
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    //Lookup stores and populate their reviews
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' } },
    //filter for only items that have 2 or more reviews
    { $match: { 'reviews.1': { $exists: true } } },
    //Add the average reviews field
    { $project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating' }
    }},
    //sort by our new field. Highest first
    { $sort: { averageRating: -1 } },
    //limit to at most 10
    { $limit: 10 }
  ]);
};

storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id', //Which field on the Store
  foreignField: 'store' //Which field on the Review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
};

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
