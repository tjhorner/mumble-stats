var mongoose = require('mongoose');

module.exports = mongoose.model('User', {
  username: String,
  timeMuted: Number,
  timeDeafened: Number,
  timeOnServer: Number
});
