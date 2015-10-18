var mongoose = require('mongoose');

module.exports = mongoose.model('Channel', {
  serverId: Number,
  name: String,
  timesVisited: Number
});
