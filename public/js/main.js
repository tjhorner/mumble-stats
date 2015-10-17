var chartsReady = false;
google.load('visualization', '1.0', {'packages':['corechart']});
google.setOnLoadCallback(function(){
  chartsReady = true;
  channelChart = new google.visualization.ColumnChart(document.getElementById("channel_chart"));
  userChart = new google.visualization.ColumnChart(document.getElementById("user_chart"));
});

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
  title: 'Channel vs. Times Visited',
  chartArea: {width: '50%'},
  hAxis: {
    title: 'Times Visited',
    minValue: 0
  },
  vAxis: {
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
    $("#user-times ul").html("");
    var chartData = [["User", "Time on Server (seconds)"]];
    users.forEach(function(user){
      chartData.push([user.username, user.timeOnServer]);
      var dur = moment.duration(user.timeOnServer, "seconds");
      $("#user-times ul").append("<li>" + user.username + ": " + dur.humanize() + " (" + user.timeOnServer + " seconds)</li>");
    });
    if(chartsReady) userChart.draw(google.visualization.arrayToDataTable(chartData), userChartOpts);
  });

  socket.on("channels", function(channels){
    $("#channels ul").html("");
    var chartData = [["Channel", "Times Visited"]];
    channels.forEach(function(channel){
      chartData.push([channel.name, channel.timesVisited]);
      $("#channels ul").append("<li>" + channel.name + ": visited " + channel.timesVisited + " times</li>");
    });
    if(chartsReady) channelChart.draw(google.visualization.arrayToDataTable(chartData), channelChartOpts);
  });
});
