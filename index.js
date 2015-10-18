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
  // models.User.find(function(err, users){
  //   users.forEach(function(user){
  //     user.remove();
  //   });
  // });
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

function getChannelPath(channel, path){
  path = path || channel.name;
  if(channel.parent){
    path = channel.parent.name + (path === "" ? "" : "->") + path;
    return getChannelPath(channel.parent, path);
  }else{
    return path;
  }
}

function deleteFromArray(array, value){
  var newArray = [];
  array.forEach(function(v){
    if(v !== value) newArray.push(v);
  });
  return newArray;
}

function boot(){
  console.log("DB and Mumble ready, starting.");

  // get initial users when connecting
  var mumbleUsers = [],
      mutedUsers = [],
      deafenedUsers = [];

  function sendOnlineUsers(){
    var usersWithChannels = [];
    mumbleUsers.forEach(function(username){
      if(mumble.userByName(username)){
        usersWithChannels.push("<b>" + username + "</b>: " + mumble.userByName(username).channel.name);
      }else{
        usersWithChannels.push(fakeUser);
      }
    });
    io.emit("users:online", usersWithChannels);
  }

  mumble.users().forEach(function(user){
    mumbleUsers.push(user.name);
    if(user.selfDeaf) deafenedUsers.push(user.name);
    if(user.selfMute) mutedUsers.push(user.name);
  });

  mumble.on('user-disconnect', function(user){
    console.log(user.name + " disconnected");
    mumbleUsers = deleteFromArray(mumbleUsers, user.name);
    sendOnlineUsers();
  });

  mumble.on('user-connect', function(user){
    console.log(user.name + " connected");
    mumbleUsers.push(user.name);
    sendOnlineUsers();
  });

  mumble.on('user-move', function(user, oldChannel, newChannel){
    console.log(user.name + " moved to " + newChannel.name + " from " + oldChannel.name);
    models.Channel.find({ serverId: newChannel.id }, function(err, channels){
      if(!channels[0]){
        var channel = new models.Channel({ serverId: newChannel.id, name: getChannelPath(newChannel), timesVisited: 0 });
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

  mumble.on('channel-rename', function(channel){
    models.Channel.find({ serverId: channel.id }, function(err, channels){
      channels.forEach(function(dbChannel){
        dbChannel.name = getChannelPath(channel);
        dbChannel.save(function(){
          models.Channel.find().sort([["timesVisited", "descending"]]).exec(function(err, channels){
            io.emit("channels", channels);
          });
        });
      });
    });
  });

  mumble.on('channel-remove', function(channel){
    models.Channel.find({ serverId: channel.id }, function(err, channels){
      channels[0].remove(function(){
        models.Channel.find().sort([["timesVisited", "descending"]]).exec(function(err, channels){
          io.emit("channels", channels);
        });
      });
    });
  });

  // init website
  io.on('connection', function(socket){
    sendOnlineUsers();

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
          var user = new models.User({ username: mumbleUser, timeOnServer: 0, timeDeafened: 0, timeMuted: 0 });
          user.timeOnServer = user.timeOnServer + 1;
          if(mumble.userByName(mumbleUser).selfMute) user.timeMuted = user.timeMuted + 1;
          if(mumble.userByName(mumbleUser).selfDeaf) user.timeDeafened = user.timeDeafened + 1;
          user.save();
        }else{
          var user = users[0];
          user.timeOnServer = user.timeOnServer + 1;
          if(mumble.userByName(mumbleUser).selfMute) user.timeMuted = user.timeMuted + 1;
          if(mumble.userByName(mumbleUser).selfDeaf) user.timeDeafened = user.timeDeafened + 1;
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
