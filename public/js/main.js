var chartsReady = false;
google.load('visualization', '1.0', {'packages':['corechart']});
google.setOnLoadCallback(function(){
  chartsReady = true;
  channelChart = new google.visualization.ColumnChart(document.getElementById("channel_chart"));
  // userChart = new google.visualization.ColumnChart(document.getElementById("user_chart"));
});

function secondsToHumanReadable(seconds){
  var str = "";
  var years = Math.floor(seconds / 31536000);
  if(years) str += years + "y ";
  var days = Math.floor((seconds % 31536000) / 86400);
  if(days) str += days + "d ";
  var hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
  if(hours) str += hours + "h ";
  var mins = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
  if(mins) str += mins + "m ";
  var secs = (((seconds % 31536000) % 86400) % 3600) % 60;
  str += secs + "s";
  return str;
}

var userChartOpts = {
  title: 'User vs. Time on Server',
  chartArea: {width: '50%'},
  vAxis: {
    title: 'Time on Server (seconds)',
    minValue: 0
  },
  hAxis: {
    title: 'User'
  }
};

var channelChartOpts = {
  title: 'Channel vs. Times Joined',
  chartArea: {width: '80%'},
  height: 500,
  vAxis: {
    title: 'Times Joined',
    minValue: 0
  },
  hAxis: {
    title: 'Channel'
  },
  animation: {
    duration: 1000,
    easing: 'out'
  }
};

$(document).ready(function(){
  var socket = io.connect();

  socket.on("users:online", function(users){
    $("#users-online ul").html("");
    users.forEach(function(user){
      $("#users-online ul").append("<li>" + user + "</li>");
    });
  });

  socket.on("users:times", function(users){
    $("#user-times ol").html("");
    // var chartData = [["User", "Time on Server (seconds)"]];
    users.forEach(function(user){
      // chartData.push([user.username, user.timeOnServer]);
      $("#user-times ol").append("<li><b>" + user.username + "</b>: " + secondsToHumanReadable(user.timeOnServer) + "</li>");
    });
    // if(chartsReady) userChart.draw(google.visualization.arrayToDataTable(chartData), userChartOpts);

    $("#users-muted ol").html("");
    var sortedByMuteTime = users.sort(function(a, b){
      if (a.timeMuted > b.timeMuted)
        return -1;
      if (a.timeMuted < b.timeMuted)
        return 1;
      return 0;
    });

    sortedByMuteTime.forEach(function(user){
      $("#users-muted ol").append("<li><b>" + user.username + "</b>: " + secondsToHumanReadable(user.timeMuted) + "</li>");
    });

    $("#users-deafened ol").html("");
    var sortedByDeafTime = users.sort(function(a, b){
      if (a.timeDeafened > b.timeDeafened)
        return -1;
      if (a.timeDeafened < b.timeDeafened)
        return 1;
      return 0;
    });

    sortedByDeafTime.forEach(function(user){
      $("#users-deafened ol").append("<li><b>" + user.username + "</b>: " + secondsToHumanReadable(user.timeDeafened) + "</li>");
    });
  });

  socket.on("channels", function(channels){
    $("#channels ol").html("");
    var chartData = [["Channel", "Times Joined"]],
        names = [];
    channels.forEach(function(channel){
      if(names.indexOf(channel.name) !== -1) channel.name = channel.name + " (2)";
      chartData.push([channel.name, channel.timesVisited]);
      names.push(channel.name);
      $("#channels ol").append("<li><b>" + channel.name.split("->")[channel.name.split("->").length-1] + "</b>: joined " + channel.timesVisited + " times</li>");
    });
    var shitChecker = setInterval(function(){
      if(chartsReady){
        channelChart.draw(google.visualization.arrayToDataTable(chartData), channelChartOpts);
        clearInterval(shitChecker);
      }
    }, 100);
  });
});
