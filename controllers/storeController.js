const mongoose = require('mongoose');
const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.createStore = async (req, res) => {
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  //1. query database for a list of all the stores
  const stores = await Store.find();
  res.render('stores', {title: 'Stores', stores});
};

exports.editStore = async (req, res) => {
  //1. find the store given the id
  const store = await Store.findOne({_id: req.params.id });
  //TODO 2. confirm they are the owner of the store
  //3. render out the edit form so the user can update their store
  res.render('editStore', { title: `Edit ${store.name}` , store});
};

exports.updateStore = async (req, res) => {
  //1. Find Store and update if exists
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, //return the new store instead of the old one
    runValidators: true
  }).exec();
  req.flash('success', `Successfully updated ${store.name} <a href="/stores/${store.slug}">View Store</a>`);
  //2. Redirect them to the store and respond with success error
  res.redirect(`/stores/${store._id}/edit`);
};
