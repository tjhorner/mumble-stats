var mongoose = require('mongoose');

module.exports = mongoose.model('TimeEntry', {
  date: Date,
  minutes: Number
});
