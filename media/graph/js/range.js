$.ui.plugin.add("draggable", "collide", {
    start: function(event, ui) {
        var $t = $(this), widget = $t.data("draggable");
        widget.peer = widget.options.collide;
    },

    drag: function(event, ui) {
        var $t = $(this), widget = $t.data("draggable");
        var $p = $(widget.peer);
        var mouseX = ui.position.left;

        var myX = $t.position().left;
        var myWidth = $t.width();
        var peerX = $p.position().left;
        var peerWidth = $p.width();

        // Are we the left slider?
        if (myX < peerX) {
            if (mouseX+myWidth > peerX) ui.position.left = peerX - myWidth;
        } else {
            if (mouseX < peerX+peerWidth) ui.position.left = peerX + peerWidth;
        }
    }
});

var handle = [];
function makeFunc(func, value) {
   return function(){func(value);};
}

function Range(container, feeds, control, wind) {
  this.container = container;
  this.feeds = feeds;
  this.control = control;
  if (wind != undefined)
    this.wind = wind;
  else
    this.wind = 3*24*60*60*1000;
  this._init();   
}

Range.prototype.refresh = function() {
  //this.graph.drawUTC(0, time.serverNow());

  this.graph.plot.resize();
  this.graph.plot.setupGrid();
  this.graph.plot.draw();

  this.scroll_api.reinitialise();
  this.scroll_api.scrollToPercentX(100);
  this._updateShade();
}

Range.prototype._init = function() {
  var top = $("<div/>");
  top.css({
    'position': 'relative',
    'top': '0px',
    'left': '0px',
    'width': '100%',
    'height': this.container.height() - 20
  });
  this.container.append(top);

  this.graph_div = $("<div/>");
  this.graph_div.css({
    'position': 'relative',
    'top': '0px',
    'left': '0px',
    'width': '100%',
    'height': this.container.height() - 20,
    'z-index': '1'
  });
  this.graph = new Graph(this.graph_div, this.feeds, 'range');
  top.append(this.graph_div);
  this.graph.drawUTC(0, time.serverNow());
  this.first = this.feeds[0].first_time;
  this.range = (this.feeds[0].last_time - this.wind) - this.feeds[0].first_time;
  var range_px = this.graph.getXPos(this.feeds[0].last_time - this.wind) - this.graph.getXPos(this.feeds[0].first_time);
 
  // Cover the graph to prevent clicking 
  var cover = $("<div/>");
  cover.css({
    'position': 'absolute',
    'top': '0px',
    'left': '0px',
    'width': '100%',
    'height': '100%',
    'z-index': '2'
  });
  top.append(cover);

  // Draw the range selection bars
  var pos = this.graph.plot.getPlotOffset(); 
  this.select = $("<div/>");
  this.select.css({
    'position': 'absolute',
    'top': pos.top,
    'left': pos.left - 4.5,
    'right': pos.right - 4.5,
    'bottom': pos.bottom,
    'width': '100%',
    'z-index': '3'
  });
  this.shade = $("<div/>");
  this.shade.css({
    'position': 'absolute',
    'top': '0px',
    'left': '0px', 
    'width': '0px', 
    'height': '100%', 
    'background-color': 'black'
  });
  this.shade.css('opacity', 0.2);
  this.select.append(this.shade);
  top.append(this.select);
  this._initSelector();

  this.scroll = $("<div/>");
  this.scroll.css({
    'position': 'relative',
    'top': -5,
    //'width': this.graph.plot.width(),
    'width': '100%',
    'height': '20px',
    'margin-left': this.graph.plot.getPlotOffset().left,
    'clear': 'both',
    'overflow': 'auto'
  });
  this.scroll_size = $('<div/>');
  this.scroll_size.css({
    'width': range_px,
    'height': "100%"
  });
  this.scroll.append(this.scroll_size)
  this.container.append(this.scroll);
  var tmp = this.scroll.jScrollPane( {
      showArrows: true,
      horizontalGutter: 10
  });
  this.scroll_api = tmp.data('jsp');
  tmp.bind('jsp-stop-drag', makeFunc(function(t) { t._update_range_scroll(); }, this));
  tmp.bind('mouseup.jsp', makeFunc(function(t) { t._update_range_scroll(); }, this));
  tmp.bind('jsp-scroll-x', function(t) { return function() { t._update_scroll(); } }(this));
  this.scroll_api.scrollToPercentX(100);
}

Range.prototype._update_range_scroll = function() {
  var now = new Date().getTime();
  if (this.last_update == undefined || now - this.last_update > 50) {
    this._updateRange();
  }

  this.last_update = now;
}

Range.prototype._update_scroll = function() {
  //function(event, scrollPositionX, isAtLeft, isAtRight)
  var start = this.first + this.range * this.scroll_api.getPercentScrolledX();
  var end = start + this.wind;

  var opts = this.graph.plot.getAxes().xaxis.options;
  opts.min = time.toLocal(start);
  opts.max = time.toLocal(end);
  this.graph.plot.setupGrid();
  this.graph.plot.draw();
}


Range.prototype._initSelector = function() {
  var img_up = "/media/graph/img/tab.png";
  var img_down = "/media/graph/img/tab_down.png";

  this.handle = [1,2];
  var img;
  for (var i = 0; i < 2; i++) {
    this.handle[i] = $("<div/>");
    this.handle[i].css("position", "absolute");
    this.handle[i].css("height", this.select.height());
    if (i == 0)
      this.handle[i].css("left", "0px");
    else
      this.handle[i].css("right", "0px");
    this.select.append(this.handle[i]);

    var line = $("<div/>");
    line.css("position", "absolute");
    line.css("left", "50%");
    line.css("width", "1px");
    line.css("height", "100%"); 
    line.css("background-color", "black"); 
    this.handle[i].append(line);

    // Note: dynamic height, width does not work in Chrome, need to specify statically
    var img = $("<div><img src='" + img_up + "' width=9 height=16></div>");
    img.css("position", "absolute"); 
    this.handle[i].append(img);

    this.handle[i].width(img.width());
    img.css("top", this.handle[i].height() / 2 - img.height() / 2);
    line.css("left", this.handle[i].width() / 2 - line.width() / 2);

    this.handle[i].mouseover(makeFunc(function(i) { i.children().attr("src", img_down); }, img));
    this.handle[i].mouseout(makeFunc(function(i) { if(!i.parent().hasClass('ui-draggable-dragging')) i.children().attr("src", img_up); }, img));

    this.handle[i].draggable({
      axis: 'x',
      containment: 'parent',
      //drag : makeFunc(function(h) { this.updateShade(); moveSlider(h);}, this.handle[i]),
      drag : makeFunc(function(t) { t._updateShade(); }, this ),
      //start : makeFunc(function(i) { i.children().attr("src", "tab_down.png"); }, img),
      //stop : makeFunc(function(i) { i.children().attr("src", "tab.png"); this._updateShade(); this._updateRange(); }, img)
      stop : makeFunc(function(t) { 
        for (var i = 0; i < 2; i++) t.handle[i].children().children().attr("src",img_up);
        t._updateShade();
        t._updateRange(); }, this)
    });
  }
  this.handle[0].draggable({collide: this.handle[1]});
  this.handle[1].draggable({collide: this.handle[0]});
  /*
  $("#shade").draggable({
    axis: 'x',
    containment: 'parent'
  });
  */
  this._updateShade();
  this._updateRange();
}

Range.prototype._updateRange = function() {
  var start = this.graph.getXVal(this.handle[0].position().left);
  var end = this.graph.getXVal(this.handle[1].position().left);
  for (c in this.control) {
    this.control[c].draw(start, end);
  }
}

Range.prototype._updateShade = function() {
  leftX = Math.round(this.handle[0].position().left + this.handle[0].width() / 2);
  rightX = Math.round(this.handle[1].position().left + this.handle[1].width() / 2);
  this.shade.css("left", leftX);
  this.shade.css("width", rightX - leftX);
}

function Live(graph, wind) {
  this.graph = graph;
  this.wind = wind;
  this.last = 0;
  this.refresh = makeFunc(function(t) { t._refresh(); }, this);
  
  this.refresh();
}

Live.prototype.start = function() {
  $(this).everyTime(1000, this.refresh);
}

Live.prototype.stop = function() {
  $(this).stopTime();
}

Live.prototype._refresh = function() {
  var latest = this.graph.feeds[0].getLatest();
  if (latest > this.last) {
    this.graph.drawUTC((latest-this.wind)*1000, latest*1000);
  }
  this.last = latest;
}

