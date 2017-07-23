const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const striptags = require('striptags');

//may need to consider adding a library that will strip away any HTML that was input into the store object

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true);
    }
    else {
      next({message: 'That file type isnt\' allowed you twat!'}, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  //check if there is no new file to resize
  if(!req.file) {
    next(); //Skip to next middleware
    return;
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`
  //resize the image properly
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  //Once file has been resized and saved, skip to next middleware
  next();
};

exports.removeHTML = async (req, res, next) => {
  req.body.name = striptags(req.body.name);
  req.body.description = striptags(req.body.description);
  req.body.slug = striptags(req.body.slug);
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  //1. query database for a list of all the stores
  const stores = await Store.find();
  res.render('stores', {title: 'Stores', stores});
};

const confirmOwner = (store, user) => {
  if(!store.author.equals(user._id)) {
    throw Error('You must own the store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  //1. find the store given the id
  const store = await Store.findOne({_id: req.params.id });
  //2. confirm they are the owner of the store
  confirmOwner(store, req.user);
  //3. render out the edit form so the user can update their store
  res.render('editStore', { title: `Edit ${store.name}` , store});
};

exports.updateStore = async (req, res) => {
  //Set location data to be a point
  req.body.location.type = 'Point';
  //1. Find Store and update if exists
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, //return the new store instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated ${store.name} <a href="/stores/${store.slug}">View Store</a>`);
  //2. Redirect them to the store and respond with success error
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  //1. Query database to find store based off slug in URL
  const store = await Store.findOne({slug: req.params.slug}).populate('author');
  if(!store) { return next(); }
  //3. If store is there, render view with the store as the model
  res.render('store', { title: `${store.name}` , store});
};

exports.getStoresByTag = async (req, res) => {
  //1. Get A list of all the stores
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true }
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', { title: 'Tags' , tags, tag, stores});
};

exports.searchStores = async (req, res) => {
  const stores = await Store
  //Find stores that match
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  //Sort them based on how much they match the search
  .sort({
    score: { $meta: 'textScore' }
  })
  //limit to only 5 results
  .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);

  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: 10000 //10km
      }
    }
  };

  const stores = await Store
  .find(q)
  .select('slug name description location photo')
  .limit(10);

  res.json(stores);
};
