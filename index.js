// requires and stuff
var config = require('./config.json'),
    mongoose = require('mongoose'),
    db = mongoose.connection,
    Mumble = require('mumble'),
    models = require('./models'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http);

app.use(express.static('public'));

// other things, related to actual operation
var mumbleReady = dbReady = false,
    mumble;

db.once('open', function(callback){
  console.log("Database connection established.");
  dbReady = true;
  checkReady();
});

Mumble.connect(config.MUMBLE_SERVER, {}, function(err, conn){
  conn.authenticate(config.MUMBLE_USERNAME || "StatTrack");
  conn.on('initialized', function(){
    console.log("Mumble connection established.");
    mumbleReady = true;
    mumble = conn;
    checkReady();
  });
});

function deleteFromArray(array, value){
  var newArray = [];
  array.forEach(function(v){
    if(v !== value) newArray.push(v);
  });
  return newArray
}

function boot(){
  console.log("DB and Mumble ready, starting.");

  // get initial users when connecting
  var mumbleUsers = [];

  mumble.users().forEach(function(user){
    mumbleUsers.push(user.name);
  });

  mumble.on('user-disconnect', function(user){
    console.log(user.name + " disconnected");
    mumbleUsers = deleteFromArray(mumbleUsers, user.name);
    io.emit("users:online", mumbleUsers);
  });

  mumble.on('user-connect', function(user){
    console.log(user.name + " connected");
    mumbleUsers.push(user.name);
    io.emit("users:online", mumbleUsers);
  });

  mumble.on('user-move', function(user, oldChannel, newChannel){
    console.log(user.name + " moved to " + newChannel.name + " from " + oldChannel.name);
    models.Channel.find({ name: newChannel.name }, function(err, channels){
      if(!channels[0]){
        var channel = new models.Channel({ name: newChannel.name, timesVisited: 0 });
        channel.timesVisited = channel.timesVisited + 1;
        channel.save(function(){
          models.Channel.find().sort([["timesVisited", "descending"]]).exec(function(err, channels){
            io.emit("channels", channels);
          });
        });
      }else{
        var channel = channels[0];
        channel.timesVisited = channel.timesVisited + 1;
        channel.save(function(){
          models.Channel.find().sort([["timesVisited", "descending"]]).exec(function(err, channels){
            io.emit("channels", channels);
          });
        });
      }
    });
  });

  // init website
  io.on('connection', function(socket){
    socket.emit("users:online", mumbleUsers);

    models.Channel.find().sort([["timesVisited", "descending"]]).exec(function(err, channels){
      socket.emit("channels", channels);
    });

    models.User.find().sort([["timeOnServer", "descending"]]).exec(function(err, users){
      socket.emit("users:times", users);
    });
  });

  http.listen(8080);

  setInterval(function(){
    mumbleUsers.forEach(function(mumbleUser){
      models.User.find({ username: mumbleUser }, function(err, users){
        if(!users[0]){
          var user = new models.User({ username: mumbleUser, timeOnServer: 0 });
          user.timeOnServer = user.timeOnServer + 1;
          user.save();
        }else{
          var user = users[0];
          user.timeOnServer = user.timeOnServer + 1;
          user.save();
        }
      });
    });

    models.User.find().sort([["timeOnServer", "descending"]]).exec(function(err, users){
      io.emit("users:times", users);
    });
  }, 1000);
}

function checkReady(){
  if(mumbleReady && dbReady) boot();
}

mongoose.connect(config.MONGO_URI);
