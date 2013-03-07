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
    SAMPLE_SIZE: 128, //Default sample_size
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
        var inc = Math.ceil(buffer.length/1000),
          buffersummary = {top: [], bottom: []},
          samplearea = Math.max(0, Math.floor(inc/samplesize)),
          audioBuffer = buffer.getChannelData(0), avgt = 0.0,
          avgb = 0.0, max = -1, min = 0;

        for(var i = 0; i < buffer.length; i += inc){
          for(var j = 0; j < samplesize; j++){
            if(audioBuffer[Math.round(i+j*samplearea)] > 0)
            avgt += audioBuffer[Math.round(i+j*samplearea)];
            else
            avgb += audioBuffer[Math.round(i+j*samplearea)];
          }
          avgt /= samplesize;
          avgb /= samplesize
          if(avgt > max)
            max = avgt;
          if(avgb < min)
            min = avgb;
          if(!isNaN(avgt))
            buffersummary.top.push(avgt);
          else
            buffersummary.top.push(0);

          if(!isNaN(avgb))
            buffersummary.bottom.push(avgb);
          else
            buffersummary.bottom.push(0);

          avgt = 0.0;
          avgb = 0.0;
        }

        return {summary: buffersummary, min: min, max: max};
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
  $(".loading").remove();

  var buffersummary = soundPlayer.stageSound(0);

  var max = buffersummary.max,
    min = buffersummary.min,
    buffersummarytop = buffersummary.summary.top,
    buffersummarybottom = buffersummary.summary.bottom;
  var top = 70, bottom = 30;
  var width = 1000, height = top + bottom;

  var x = d3.scale.linear()
    .range([0, width]);

  var y = d3.scale.linear()
    .range([height, 0]);

  var areatop = d3.svg.area()
    .x(function(d, i) { return x(i); })
    .y0(top)
    .y1(function(d){ return y(d); });

  var areabottom = d3.svg.area()
    .x(function(d, i) { return x(i); })
    .y0(function(d){ return y(d *.5);})
    .y1(top);


  var svg = d3.select("body").select("svg")
    .attr("width", width)
    .attr("height", height);

  x.domain([0, buffersummary.summary.top.length]);
  y.domain([min*.5,  max]);

  var clippath = svg.append("clipPath")
    .attr("id", "clip");

  clippath.append("path")
    .datum(buffersummary.summary.top)
    .attr("d", areatop)

  clippath.append("path")
    .datum(buffersummary.summary.bottom)
    .attr("d", areabottom)

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

  var topgroup = group.append("g")
    .attr("class", "top");

  var bottomgroup = group.append("g")
    .attr("class", "bottom")
    .attr("transform", "translate(0," + top + ")");

  var trackertop = topgroup.append("rect")
    .attr("class", "foreground")
      .attr("width", 0)
      .attr("height", top)
    .style('fill', 'url(#foreground-gradiant)');

  var trackerbottom = bottomgroup.append("rect")
      .attr("class", "foreground")
      .attr("width", 0)
      .attr("height", bottom);

  var backgroundtop = topgroup.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", top)
    .style('fill', 'url(#background-gradiant)');

  var backgroundbottom = bottomgroup.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", bottom);

  var timestamp = d3.select(".sound-container").append("div")
    .attr("class", "timestamp")
    .attr("style", "left: 0;")
    .text("0:00");

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
    d3.selectAll(".foreground").attr("width", x);
    d3.selectAll(".background")
      .attr("width", width-x)
      .attr("transform", "translate("+ x + ", 0)");
    $(".play-btn").addClass("pause");
    playSound((x/width), width, timestamp);
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
      playSound(time, width, timestamp);
    }

  });

  var intervalTimer;

  function playSound(time, width, timestamp) {
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
        d3.selectAll(".foreground").attr("width", 0);
        d3.selectAll(".background")
          .attr("width", width)
          .attr("transform", "translate("+ 0 + ", 0)");
      } else {
        d3.selectAll(".foreground").attr("width", w);

        time = Math.round(diff+offset);

        secs = time%60;

        secs < 10 && (secs = "0" + secs);

        timestamp.attr("style", "left:" + parseInt((w+1)) + "px;").text(parseInt(time/60) + ":" + secs);

        d3.selectAll(".background")
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

