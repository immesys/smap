/* Time Class - Syncronize clock with server */
function Time() {
  // Time diff from server time
  var d = 0;
  $.ajax({
    url: "/smap/now",
    async: false,
    error: function(jqXHR, textStatus, errorThrown) {
      debug(textStatus);
    },
    success: function(data) {
      var server_time = parseFloat(data);
      if (server_time != NaN)
        d = new Date().getTime() - server_time*1000;
    }
  });
  this.diff = d;
}
Time.prototype.serverNow = function() {
  return new Date().getTime() - this.diff;
}
Time.prototype.toLocal = function(t){
  return t - new Date().getTimezoneOffset() * 60*1000;
}
Time.prototype.toUTC = function(t) {
  return t + new Date().getTimezoneOffset() * 60*1000;
}

var time = new Time();
