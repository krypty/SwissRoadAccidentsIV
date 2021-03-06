(function( $ ) {
    $.fn.pieChart = function(options) {
        var settings = $.extend({
            
			// Config settings
			chartSizePercent: 55,                        // The chart radius relative to the canvas width/height (in percent)
			sliceBorderWidth: 1,                         // Width (in pixels) of the border around each slice
			sliceBorderStyle: "#fff",                    // Colour of the border around each slice
			chartStartAngle:    -.5 * Math.PI,              // Start the chart at 12 o'clock instead of 3 o'clock
			collapseAnimDuration: 700,					// The duration in ms of the collapse animation
			expandAnimDuration: 1000,					// The duration in ms of the expand animation
			sliceRadiusDelta:20,
			maxDepthLevel: 2,
			emptyRadiusRatio: 0.5,
			middleTextFont: "15px 'Trebuchet MS', Verdana, sans-serif",
			labelDistance: 52,
			labelFont: "12px 'Trebuchet MS', Verdana, sans-serif",
			textPadding: 3,
			rootName: "CH",
			flagHeight: 50,				
			
        }, options );
		
		// Declare some variables for the chart
	   chartData = [];               // Chart data (labels, values, and angles)
	   chartColours = [];            // Chart colours (pulled from the HTML table)
	   totalValue = 0;                // Total of all the values in the chart
	   slicesCount = 0;
	   animationTime = 0;
	   lastTime = new Date().getTime();
	   isAnimationRunning = false;
	   hoveredSlice = -1;
	   centerHovered = false;
		flagAlpha = 0;
		needRedrawFlag = true;
	   
	   depthLevel = 0;
	   hierarchy = [];
	   hierarchyArray = ["regions","cantons", ""];
	   currentYear = 1997;
	   dataLoaded = false;
					
		$.getValues("colors", function(colors) {
			
			victims_colors = colors;
		});
	   
	   window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

	   
		// Get the canvas element in the page
		canvas = document.getElementById('chart');
		canvas.addEventListener('mousemove', function(evt) {
			handleChartHover(evt, settings);
		});
		
		img = new Image;

		// Exit if the browser isn't canvas-capable
		if ( typeof canvas.getContext === 'undefined' ) return;

		// Initialise some properties of the canvas and chart
		centerChart(settings);
		currentChartRadius = emptyRadius;
		
		//Load injury traduction
		$.getJSON( "data/helpers/injury.json", function( data ) {
			injuryData = data;
		});
		
		$.getValues("data", function(data) {

			statsData = data;
			
			updateChart(settings);
			dataLoaded = true;
			requestAnimationFrame(function(timestamp) {
						animationTime = 0;
						lastTime = new Date().getTime();
						isAnimationRunning = true;
						expandAnimationStep(timestamp, settings);
			});
			$('#chart').click ({settings: settings}, handleChartClick );
			
		});

		//Run function when browser resizes
		$(window).resize( function() {
			
			centerChart(settings);
			currentChartRadius = chartRadius + settings.sliceRadiusDelta * slicesCount;
			
			//redraw the chart
			drawChart(settings);
		});

		var that = this;
		$(document).on("year-change", function(e, year) {
			if(dataLoaded)
			{
				currentYear = year;
				updateChart(settings);
				drawChart(settings);
			}
		});
    };
}( jQuery ));

function centerChart(settings)
{
	var c = $('#chart');
	var container = $(c).parent();
			
	c.attr('width', $(container).width() ); //max width
	c.attr('height', $(container).height() ); //max height
	
	canvasWidth = canvas.width;
	canvasHeight = canvas.height;
	centreX = canvasWidth / 2;
	centreY = canvasHeight / 2;
	chartRadius = Math.min( canvasWidth, canvasHeight ) / 2 * ( settings.chartSizePercent / 100 );
	emptyRadius = chartRadius * settings.emptyRadiusRatio;
}

function getCurrentRoot() {
	
	var root = statsData.year["_" + currentYear][hierarchyArray[0]];
	for(i = 0; i < depthLevel; i++)
	{
		if(hierarchyArray[i+1] != "")
			root = root[hierarchy[i]][hierarchyArray[i+1]];
		else
			root = root[hierarchy[i]];
	}
	
	return root;
}

function updateChart(settings) {
	
	//Find the current root for the data
	var root = getCurrentRoot();
	if(depthLevel < settings.maxDepthLevel)
		fillChart(root);
	else
		fillLastLevel(root);

	// Now compute and store the start and end angles of each slice in the chart data
	var currentPos = 0; // The current position of the slice in the pie (from 0 to 1)

	for ( var slice in chartData ) {
	  chartData[slice]['startAngle'] = 2 * Math.PI * currentPos;
	  chartData[slice]['endAngle'] = 2 * Math.PI * ( currentPos + ( chartData[slice]['value'] / totalValue ) );
	  currentPos += chartData[slice]['value'] / totalValue;
	}
	
	needRedrawFlag = true;
}

function fillChart(obj) {
	
	slicesCount = Object.keys(obj).length;
	var colorSlice = 255 / slicesCount;
	totalValue = 0;

	var currentRow = -1;
	chartData = [];
	$.each(obj, function(key, dataValue) {

		currentRow++;
		chartData[currentRow] = [];
		chartData[currentRow]['key'] = key;
		chartData[currentRow]['label'] = key;
		chartData[currentRow]['value'] = dataValue.total;
		totalValue += dataValue.total;
		
		//Colors (HSL)
		chartColours[currentRow] = [colorSlice * currentRow, "80%", "80%" ];
	   
	});
	
}

function fillLastLevel(obj) {
	
	slicesCount = Object.keys(obj).length - 1; // Remove the total
	var colorSlice = 255 / slicesCount;
	totalValue = obj["total"];

	var currentRow = -1;
	chartData = [];
	$.each(obj, function(key, value) {

		if(key != "total")
		{
			currentRow++;
			chartData[currentRow] = [];
			chartData[currentRow]['key'] = key;
			chartData[currentRow]['label'] = injuryData[key]["fr"]; //TODO language variable 
			chartData[currentRow]['value'] = value;
			
			//Colors (HSL)
			var color = d3.rgb(victims_colors[key]).hsl();

			if(isNaN(color.h))
				color.h = 0;
			if(isNaN(color.s))
				color.s = 0;
			if(isNaN(color.l))
				color.l = 0;

			chartColours[currentRow] = [(color.h / 360.0)*255.0, color.s*100 + "%", "80%"];
		}
	});
}

function isCurrentLevelEmpty(settings)
{
	if(depthLevel == 0 || depthLevel == settings.maxDepthLevel)
		return false;
	
	var root = getCurrentRoot();
		
	return Object.keys(root).length < 2;
}

// Get the mouse cursor position, relative to the canvas
function getMousePos(canvas, evt)
{
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
}


/**
   * Process mouse clicks in the chart area.
   *
   * If a slice was clicked, display detail about it
   * If the user clicked inside the empty radius, return to the previous level
   *
   * @param Event The click event
   */

  function handleChartClick ( clickEvent ) {
	  
	// If an animation is running, we ignore any click event
	if(!isAnimationRunning)
	{
		var settings = clickEvent.data.settings;

		// Get the mouse cursor position at the time of the click, relative to the canvas		
		var mousePos = getMousePos(canvas, clickEvent);

		// Was the click inside the pie chart?
		var xFromCentre = mousePos.x - centreX;
		var yFromCentre = mousePos.y - centreY;
		var distanceFromCentre = Math.sqrt( Math.pow( Math.abs( xFromCentre ), 2 ) + Math.pow( Math.abs( yFromCentre ), 2 ) );
		
		if(distanceFromCentre <= emptyRadius)
		{
			if(depthLevel > 0)
			  {	
				  requestAnimationFrame(function(timestamp) {
						animationTime = 0;
						isAnimationRunning = true;
						lastTime = new Date().getTime();
						collapseAnimationStep(timestamp, settings, function() {
							
							 do
							  {
									depthLevel--;
									hierarchy.pop();
							  }
							  while(isCurrentLevelEmpty(settings)) //Jump to a previous non-empty level
						});
					});
			  }
		}
		else if ( distanceFromCentre <= chartRadius ) {

		  // Find the slice that was clicked by comparing angles relative to the chart centre.

		  var clickAngle = Math.atan2( yFromCentre, xFromCentre ) - settings.chartStartAngle;
		  if ( clickAngle < 0 ) clickAngle = 2 * Math.PI + clickAngle;
					  
		  for ( var slice in chartData ) {
			if ( clickAngle >= chartData[slice]['startAngle'] && clickAngle <= chartData[slice]['endAngle'] ) {
			  
			  if(depthLevel < settings.maxDepthLevel)
			  {
					requestAnimationFrame(function(timestamp) {
						animationTime = 0;
						isAnimationRunning = true;
						lastTime = new Date().getTime();
						collapseAnimationStep(timestamp, settings, function(){
							
							depthLevel++;
							hierarchy.push(chartData[slice]['key']);

							while(isCurrentLevelEmpty(settings)) //Ignore any empty (less than 2 elements in array) intermediate level
							{
								var root = getCurrentRoot();
								depthLevel++;
								hierarchy.push(Object.keys(root)[0]);
							}
							
						});
					});
			  }
			  
			  return;
			}
		  }
		}
	}
  }
  
  function handleChartHover( hoverEvent, settings ) {
	  
	// Get the mouse cursor position at the time of the click, relative to the canvas		
	var mousePos = getMousePos(canvas, hoverEvent);

	// Was the click inside the pie chart?
	var xFromCentre = mousePos.x - centreX;
	var yFromCentre = mousePos.y - centreY;
	var distanceFromCentre = Math.sqrt( Math.pow( Math.abs( xFromCentre ), 2 ) + Math.pow( Math.abs( yFromCentre ), 2 ) );
	
	if(distanceFromCentre <= emptyRadius) {
		hoveredSlice = -1;
		centerHovered = true;
		drawChart(settings);
	}
	else if ( distanceFromCentre <= chartRadius ) {
		// Find the slice that was hovered by comparing angles relative to the chart centre.
		centerHovered = false;
		
		var clickAngle = Math.atan2( yFromCentre, xFromCentre ) - settings.chartStartAngle;
		if ( clickAngle < 0 ) clickAngle = 2 * Math.PI + clickAngle;
		for ( var slice in chartData ) {
			if ( clickAngle >= chartData[slice]['startAngle'] && clickAngle <= chartData[slice]['endAngle'] ) {
			  
				hoveredSlice = slice;
				drawChart(settings);
				return;
			}
		}
		hoveredSlice = -1;
	}
	else
	{
		hoveredSlice = -1;
		centerHovered = false;
		drawChart(settings);
	}
  }
  
  /*
  * 
  * timeRatio : the ratio of time for the current animation ([0, 1])
  * min : min border
  * max : max border
  * Return the result of the function for now a sin
  */
  function animationFunction(timeRatio, min, max)
  {
	  if(min <= max)
	  {
		var x = timeRatio * max + min * (1 - timeRatio);
		return Math.sin(x);
	  }
	  return NaN;
  }
  
  function collapseAnimationStep(timestamp, settings, finishFunction)
  {	
		// Decrease the chart radius
		currentChartRadius = (chartRadius + settings.sliceRadiusDelta * slicesCount) * animationFunction(animationTime / settings.collapseAnimDuration, Math.PI/2.0, Math.PI);
		
		// Decrease the flag alpha
		flagAlpha = animationFunction(animationTime / settings.collapseAnimDuration, Math.PI/2.0, Math.PI);

		if(animationTime >= settings.collapseAnimDuration) {

		finishFunction();
		
		updateChart(settings);

		requestAnimationFrame(function(timestamp) {
						animationTime = 0;
						lastTime = new Date().getTime();
						expandAnimationStep(timestamp, settings);
		});

		return;
		}

		// Draw the frame
		drawChart(settings); 

		var now = new Date().getTime();
		animationTime += now - lastTime;
		lastTime = now;
		requestAnimationFrame(function(timestamp) {
					collapseAnimationStep(timestamp, settings, finishFunction);
				});  
  }
  
  function expandAnimationStep(timestamp, settings) 
  {
	  
		// Increase the chart radius
		currentChartRadius = (chartRadius + settings.sliceRadiusDelta * slicesCount) * animationFunction(animationTime / settings.expandAnimDuration, 0, Math.PI/2.0);
		
		// Increase the chart radius
		flagAlpha = animationFunction(animationTime / settings.expandAnimDuration, 0, Math.PI/2.0);
		
		if(animationTime >= settings.expandAnimDuration) {
			isAnimationRunning = false;
			drawChart(settings);
		  return;
		}

		// Draw the frame
		drawChart(settings);

		var now = new Date().getTime();
		animationTime += now - lastTime;
		lastTime = now;
		requestAnimationFrame(function(timestamp) {
							expandAnimationStep(timestamp, settings);
					});
  }
  
  
  /**
   * Draw the chart.
   *
   * Loop through each slice of the pie, and draw it.
   */

  function drawChart(settings) {

    // Get a drawing context
    var context = canvas.getContext('2d');
        
    // Clear the canvas, ready for the new frame
    context.clearRect ( 0, 0, canvasWidth, canvasHeight );

    for ( var slice in chartData ) {
		drawSlice( context, slice, settings);
    }
	
	if(hoveredSlice >= 0 && depthLevel < settings.maxDepthLevel)
	{
		//Draw hovered slice border
		drawSliceBorder( context, hoveredSlice, settings);
	}
	
	//Draw Chart Center
	context.beginPath();
	context.arc(centreX, centreY, emptyRadius, 0, 2 * Math.PI, false);
	context.fillStyle = 'white';
	context.fill();
	
	context.fillStyle = 'rgb(0,0,0)';
	context.textAlign = "center";
	context.font = settings.middleTextFont;
	
	//Draw center border if hovered
	if(centerHovered && depthLevel > 0)
	{
		context.lineWidth = 5;
		context.strokeStyle = "skyblue";
		context.stroke();
	}
	
	//Write center text
	if(depthLevel > 0 && depthLevel < settings.maxDepthLevel)
	{
		context.fillText( hierarchy[depthLevel-1], centreX, centreY);
	}
	else
	{
		var elementName = settings.rootName;
		
		if(depthLevel == settings.maxDepthLevel)
			elementName = hierarchy[depthLevel-1];
		
		context.fillText( elementName, centreX, centreY - settings.flagHeight/2 - 10);
		
		if(needRedrawFlag)
		{
			img.src = "img/flags/" + elementName + ".svg";
			needRedrawFlag = false;
		}
		
		var aspect = img.width / img.height;
		context.globalAlpha = flagAlpha;
		context.drawImage(img, centreX-settings.flagHeight*aspect/2, centreY - settings.flagHeight/2, settings.flagHeight * aspect, settings.flagHeight);
		context.globalAlpha = 1;
	}
  }
  
  /**
   * Draw an individual slice in the chart.
   *
   * @param Context A canvas context to draw on  
   * @param Number The index of the slice to draw
   */

  function drawSlice ( context, slice, settings) {

    // Compute the adjusted start and end angles for the slice
    var startAngle = chartData[slice]['startAngle']  + settings.chartStartAngle;
    var endAngle = chartData[slice]['endAngle']  + settings.chartStartAngle;

	var currentSliceRadius = currentChartRadius - slice * settings.sliceRadiusDelta;
	
	if(currentSliceRadius > chartRadius)
		currentSliceRadius = chartRadius;
	else if(currentSliceRadius < 0)
		currentSliceRadius = 0;
	
    // Draw the slice
    context.beginPath();
    context.moveTo( centreX, centreY );
    context.arc( centreX, centreY, currentSliceRadius, startAngle, endAngle, false );
    context.lineTo( centreX, centreY );
    context.closePath();
    context.fillStyle = 'hsl(' + chartColours[slice].join(',') + ')';
    context.fill();
	
	// Draw a white border around the slice
	context.lineWidth = settings.sliceBorderWidth;
	context.strokeStyle = settings.sliceBorderStyle;
    context.stroke();
	
	// Draw the slice label
	var midAngle = (startAngle + endAngle) / 2;
	var textLocationX = centreX + Math.cos(midAngle) * ( chartRadius + settings.labelDistance);
	var textLocationY = centreY + Math.sin(midAngle) * ( chartRadius + settings.labelDistance);
	
	context.font = settings.labelFont;
	var textWidth = context.measureText(chartData[slice]['label']).width;
	var textHeight = 10; //MeasureText doesn't return the height ._.
	
	if(currentSliceRadius >= chartRadius/2.0){
	// Draw the line attached to the label
	context.beginPath();
    context.moveTo( centreX + Math.cos(midAngle) * currentSliceRadius, centreY + Math.sin(midAngle) * currentSliceRadius );
	context.lineTo( textLocationX, textLocationY );
	context.lineWidth = 1;
	context.strokeStyle = "rgb(0, 0, 0)";
	context.stroke();
	
	//Draw a white rectangle around the text
	context.fillStyle = "rgb(255, 255, 255)";
	context.fillRect(textLocationX - textWidth/2 - settings.textPadding, textLocationY - textHeight - settings.textPadding, textWidth + 2 * settings.textPadding, textHeight * 2.5 + 2 * settings.textPadding);
	
	//Draw the text
	context.textAlign = "center";
	context.fillStyle = "rgb(0, 0, 0)";
	context.font = settings.labelFont;
	context.fillText( chartData[slice]['label'], textLocationX, textLocationY );
	context.fillText( chartData[slice]['value'], textLocationX, textLocationY + textHeight * 1.5);
	}
  }
	
	function drawSliceBorder( context, slice, settings)
	{
		// Compute the adjusted start and end angles for the slice
		var startAngle = chartData[slice]['startAngle']  + settings.chartStartAngle;
		var endAngle = chartData[slice]['endAngle']  + settings.chartStartAngle;

		var currentSliceRadius = currentChartRadius - slice * settings.sliceRadiusDelta;
		
		if(currentSliceRadius > chartRadius)
			currentSliceRadius = chartRadius;
		else if(currentSliceRadius < 0)
			currentSliceRadius = 0;
		
		// Draw the slice
		context.beginPath();
		context.moveTo( centreX, centreY );
		context.arc( centreX, centreY, currentSliceRadius, startAngle, endAngle, false );
		context.lineTo( centreX, centreY );
		context.closePath();
	
		context.lineWidth = 10;
		context.strokeStyle = 'hsl(' + chartColours[slice].join(',') + ')';
		context.stroke();
	}