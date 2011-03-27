var chart = document.getElementById("chart");
var c = chart.getContext("2d");

chart.onclick = moveRect;

function drawRect() {
  c.fillRect(rect.x,rect.y,rect.width,rect.height);
}

function moveRect() {
  c.clearRect(0, 0, chart.width, chart.height);
  rect.x += 20;
  drawRect(rect);
}

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

var rect = new Rect(10, 25, 20, 50);

drawRect(rect)

