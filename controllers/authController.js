const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed login bitch.',
  successRedirect: '/',
  successFlash: 'Successfully logged in bitch!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You\'ve logged out bitch!');
  res.redirect('/');
};

exports.isLoggedIn= (req, res, next) => {
  //1. Check user is authenticated
  if(req.isAuthenticated()) {
    return next();
  }
  //2. If they are not logged in redirect them to log in
  req.flash('error', 'You must be logged in to create a store bitch.');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  //1. Check if user's email exists
  const user = await User.findOne({ email: req.body.email });
  if(!user) {
    // To prevent fraudulent use of this action, we state we have sent a password reset even though we haven't
    req.flash('error', 'A password reset has been mailed to you bitch!');
    res.redirect('/login');
  }
  //2. Set reset token and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // One hour from now
  await user.save();
  //3. Send them an email with the token
  const resetUrl = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  req.flash('success', `You have been emailed a password reset link Bitch! ${resetUrl}`);
  //4. Redirect to login page once reset token has been accepted
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // Checks for expiration date in the future
  });

  if(!user) {
    req.flash('error', 'Password reset token is invalid Bitch!');
    res.redirect('/login');
  }

  //Is there is a user, show them the reset password form
  res.render('reset', { title: 'Reset your Password' });
};

exports.confirmedPasswords = async (req, res, next) => {
  if(req.body.password === req.body['password-confirm']) {
    return next();
  }

  req.flash('error', 'Passwords don\'t match Bitch!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // Checks for expiration date in the future
  });

  if(!user) {
    req.flash('error', 'Password reset token is invalid Bitch!');
    res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', 'Password has been reset Bitch!');
  res.redirect('/');
};
