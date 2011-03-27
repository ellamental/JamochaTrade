var chart = document.getElementById("chart");
var c = chart.getContext("2d");

chart.onclick = moveRect;

function drawRect() {
  c.fillRect(rect[0],rect[1],rect[2],rect[3]);
}

function moveRect() {
  c.clearRect(0, 0, chart.width, chart.height);
  rect[0] += 20;
  drawRect(rect);
}

var rect = [10, 25, 20, 50];

drawRect(rect)

