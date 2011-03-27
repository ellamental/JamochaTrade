var chart = document.getElementById("chart");
var c = chart.getContext("2d");

chart.onclick = moveRects;

function drawRects() {
  for (var i in rects) {
    var r = rects[i];
    c.fillRect(r.x, r.y, r.width, r.height);
  }
}

function moveRects() {
  for (var i in rects) {
    rects[i].x += 20;
  }
  c.clearRect(0, 0, chart.width, chart.height);
  drawRects();
}

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

var rects = [new Rect(10, 25, 20, 50), new Rect(40, 25, 20, 50)];

drawRects();
