var context, audio, soundPlayer;

window.webkitAudioContext && (context = window.webkitAudioContext);
window.mozAudioContext && (context = window.mozAudioContext);
window.AudioContext && (context = window.AudioContext);

!function(AudioContext){

  audio = function(buffer, context){
    this.buffer = buffer;
    this.context = context;
    this.offset = 0; //The time at which the sound was played
    this.startTime = 0; //Time taken from context on play to determine the play head
    this.sourceNode = null;
    this.playing = false;
  }

  audio.prototype = {
    play: function(time){

      var context = this.context;
      this.startTime = context.currentTime;
      //default time to 0 if undefined
      time || (time = 0);

      this.offset = time;

      if(this.playing){
        this.sourceNode && this.sourceNode.noteOff(0);
      }
      this.sourceNode = context.createBufferSource();
      this.sourceNode.buffer = this.buffer;
      this.sourceNode.connect(context.destination);
      this.sourceNode.noteGrainOn(0, time, this.sourceNode.buffer.duration-time);
      this.sourceNode.noteOn(0);
      this.playing = true;
    },
    stop: function(){
      if(this.playing){
        this.sourceNode && this.sourceNode.noteOff(0);
      }
    }
  };

  soundPlayer = function(options){
    this.options = options;
    this.context = new AudioContext();
    this.source = [];
  };

  soundPlayer.prototype = {
    SAMPLE_SIZE: 8, //Default sample_size
    loadSound: function(src, callback){
      var request = new XMLHttpRequest();
      var context = this.context;
      var source = this.source;
      request.open('GET', src, true);
      request.responseType = 'arraybuffer';

      //Decode loaded data

      request.onload = function(){
        context.decodeAudioData(request.response, function(buffer){
          source.push(new audio(buffer, context));
          callback();
        });
      }

      request.send();
    },
    stageSound: function(index){

      if(this.source[index] !== undefined){
        var samplesize = this.SAMPLE_SIZE;
        var buffer = this.source[index].buffer;
        var inc = Math.ceil(buffer.length/800),
          buffersummary = [],
          samplearea = Math.max(0, Math.floor(inc/samplesize)),
          audioBuffer = buffer.getChannelData(0), avg = 0.0,
          max = -1, min = 1;

        for(var i = 0; i < buffer.length; i += inc){
          for(var j = 0; j < samplesize; j++){
            avg += audioBuffer[Math.round(i+j*samplearea)];
          }
          avg /= samplesize;
          if(avg > max)
            max = avg;
          if(avg < min)
            min = avg;
          if(!isNaN(avg))
            buffersummary.push(avg);
          avg = 0.0;
        }

        var  v = (max - min);

        for(var i = 0; i < buffersummary.length; i++){
          buffersummary[i] = (buffersummary[i]-min);
        }

        return [buffersummary, v];
      }

    },
    play: function(index, time){
      if(this.source[index] !== undefined){
        this.source[index].play(time);
      }
    },
    stop: function(index){
      if(this.source[index] !== undefined){
        this.source[index].stop();
      }
    }
  };

}(context);


var soundPlayer = new soundPlayer();

soundPlayer.loadSound("satitisfcationrlgrimes.mp3", getReady);
function getReady(){
  var buffersummary = soundPlayer.stageSound(0);

  var v = buffersummary[1];
  buffersummary = buffersummary[0];

  var width = 1000, height = 100;

  var x = d3.scale.linear()
    .range([0, width]);

  var y = d3.scale.linear()
    .range([height, 0]);

  var area = d3.svg.area()
    .x(function(d, i) { return x(i); })
    .y0(height)
    .y1(function(d){ return y(d); });

  var area2 = d3.svg.area()
    .x(function(d, i) { return x(i); })
    .y0(height)
    .y1(function(d){ return height; });


  var svg = d3.select("body").select("svg")
    .attr("width", width)
    .attr("height", height);

  x.domain([0, buffersummary.length]);
  y.domain([0,  v]);

  svg.append("clipPath")
    .attr("id", "clip")
    .append("path")
    .datum(buffersummary)
    .attr("d", area)

  svg.append("linearGradient")
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .attr('id', 'background-gradiant').call(
    function(gradient){
      gradient.append('svg:stop').attr('offset', '0%').attr('style', 'stop-color:#555555;stop-opacity:1');
      gradient.append('svg:stop').attr('offset', '100%').attr('style', 'stop-color:#333333;stop-opacity:1');
    }
  )

  svg.append("linearGradient")
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .attr('id', 'foreground-gradiant').call(
    function(gradient){
      gradient.append('svg:stop').attr('offset', '0%').attr('style', 'stop-color:#ff5c00;stop-opacity:1');
      gradient.append('svg:stop').attr('offset', '100%').attr('style', 'stop-color:#ff2400;stop-opacity:1');
    }
  )


  var group = svg.append("g").attr("clip-path", "url(#clip)");

  var tracker = group.append("rect")
    .attr("class", "foreground")
    .attr("width", 0)
    .attr("height", height)
    .style('fill', 'url(#foreground-gradiant)');

  var background = group.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .style('fill', 'url(#background-gradiant)');

  var mousetracker = svg.append("rect")
    .attr("class", "mousetracker")
    .attr("width", width)
    .attr("height", height);

  var cursor = group.append("rect")
    .attr("class", "cursor")
    .attr("width", 1)
    .attr("height", height);

  mousetracker.on("click", function(){
    var x = d3.event.offsetX;
    tracker.attr("width", x);
    background
      .attr("width", width-x)
      .attr("transform", "translate("+ x + ", 0)");
    $(".play-btn").addClass("pause");
    playSound((x/width), tracker, background, width);
  });

  var dragInterval;

  mousetracker.on("mousemove", function(){
    var x = d3.event.offsetX;
    cursor.attr("transform", "translate("+ x + ", 0)");
  });

  mousetracker.on("mouseover", function(){
    cursor.style('opacity', 1);
  });

  mousetracker.on("mouseout", function(){
    cursor.style('opacity', 0);
  });

  $(".play-btn").click(function(){
    $this = $(this);
    if($this.hasClass("pause")){
      $this.removeClass("pause");
      stopSound();
    } else {
      $this.addClass("pause");
      var time = (d3.select(".foreground").attr("width")/width);
      playSound(time, tracker, background, width);
    }

  });

  var intervalTimer;

  function playSound(time, tracker, background, width) {
    soundPlayer.play(0, time*soundPlayer.source[0].buffer.duration);

    if(intervalTimer){
      clearInterval(intervalTimer);
    }

    intervalTimer = setInterval(function(){
      var offset = soundPlayer.source[0].offset;
      var diff = soundPlayer.context.currentTime - soundPlayer.source[0].startTime;
      var w = (diff+offset)/soundPlayer.source[0].buffer.duration*width;

      if(w >= width) {
        clearInterval(intervalTimer);
        tracker.attr("width", 0);
        background
          .attr("width", width)
          .attr("transform", "translate("+ 0 + ", 0)");
      } else {
        tracker.attr("width", w);
        background
          .attr("width", width-w)
          .attr("transform", "translate("+ w + ", 0)");
      }
    }, 50);
  }

  function stopSound(){
    if(intervalTimer){
      clearInterval(intervalTimer);
    }

    soundPlayer.stop(0);
  }
}
//function scruber() {}
/**

function stop(){
  sourceNode.noteOff(0);
  clearInterval(intervalTimer);
}

var context = new webkitAudioContext();
var sourceNode;
buffersummary = [];
samplesize = 8;

// load the sound

loadSound("satitisfcationrlgrimes.mp3");

// load the specified sound
function loadSound(url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  // When loaded decode the data
  request.onload = function() {

    // decode the data
    context.decodeAudioData(request.response, function(buffer) {
      // when the audio is decoded play the sound
      parseBuffer(buffer);
    }, onError);
  }
  request.send();
}

function parseBuffer(buffer){
  globalbuffer = buffer;

  var inc = Math.ceil(buffer.length/800);
  var samplearea = Math.max(0, Math.floor(inc/samplesize));
  audioBuffer = buffer.getChannelData(0);
  var avg = 0.0;
  var max = -1;
  var min = 1;
  for(var i = 0; i < buffer.length; i += inc){
    for(var j = 0; j < samplesize; j++){
      avg += audioBuffer[Math.round(i+j*samplearea)];
    }
    avg /= samplesize;
    if(avg > max)
      max = avg;
    if(avg < min)
      min = avg;
    if(!isNaN(avg))
      buffersummary.push(avg);
    avg = 0.0;
  }

  var  v = (max - min);

  for(var i = 0; i < buffersummary.length; i++){
    buffersummary[i] = (buffersummary[i]-min);
  }

  var width = 1000, height = 100;

  var x = d3.scale.linear()
    .range([0, width]);

  var y = d3.scale.linear()
    .range([height, 0]);

  var area = d3.svg.area()
    .x(function(d, i) { return x(i); })
    .y0(height)
    .y1(function(d){ return y(d); });

  var area2 = d3.svg.area()
    .x(function(d, i) { return x(i); })
    .y0(height)
    .y1(function(d){ return height; });


  var svg = d3.select("body").select("svg")
    .attr("width", width)
    .attr("height", height);

  x.domain([0, buffersummary.length]);
  y.domain([0,  v]);

  svg.append("clipPath")
    .attr("id", "clip")
    .append("path")
    .datum(buffersummary)
    .attr("d", area)

  svg.append("linearGradient")
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .attr('id', 'background-gradiant').call(
      function(gradient){
        gradient.append('svg:stop').attr('offset', '0%').attr('style', 'stop-color:#555555;stop-opacity:1');
        gradient.append('svg:stop').attr('offset', '100%').attr('style', 'stop-color:#333333;stop-opacity:1');
      }
  )

  svg.append("linearGradient")
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
    .attr('id', 'foreground-gradiant').call(
    function(gradient){
      gradient.append('svg:stop').attr('offset', '0%').attr('style', 'stop-color:#ff5c00;stop-opacity:1');
      gradient.append('svg:stop').attr('offset', '100%').attr('style', 'stop-color:#ff2400;stop-opacity:1');
    }
  )


  var group = svg.append("g").attr("clip-path", "url(#clip)");

  var tracker = group.append("rect")
    .attr("class", "background")
    .attr("width", 0)
    .attr("height", height)
    .style('fill', 'url(#foreground-gradiant)');

  var background = group.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .style('fill', 'url(#background-gradiant)');

  var mousetracker = svg.append("rect")
    .attr("class", "mousetracker")
    .attr("width", width)
    .attr("height", height);

  var cursor = group.append("rect")
    .attr("class", "cursor")
    .attr("width", 1)
    .attr("height", height);

  mousetracker.on("click", function(){
    var x = d3.event.offsetX;
    tracker.attr("width", x);
    background
      .attr("width", width-x)
      .attr("transform", "translate("+ x + ", 0)");
    playSound(buffer, (x/width)*buffer.duration, tracker, background, width);
  });

  var dragInterval;

  mousetracker.on("mousemove", function(){
    var x = d3.event.offsetX;
    cursor.attr("transform", "translate("+ x + ", 0)");
  });

  mousetracker.on("mouseover", function(){
    cursor.style('opacity', 1);
  });

  mousetracker.on("mouseout", function(){
    cursor.style('opacity', 0);
  });

  /**var path = svg.append("path")

    .attr("class", "area")

    .on("click", function(){
      console.log((d3.event.x/width)*buffer.duration);
      playSound(buffer,(d3.event.x/width)*buffer.duration);
    });

  path.transition()
    .duration(500)
    .attr("d", area);

}
*/

// log if an error occurs
function onError(e) {
  console.log(e);
}
