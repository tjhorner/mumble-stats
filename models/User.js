var mongoose = require('mongoose');

module.exports = mongoose.model('User', {
  username: String,
  timeOnServer: Number
});
