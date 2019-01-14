function renderChart() {
	// Exposed variables
	var attrs = {
		id: 'ID' + Math.floor(Math.random() * 1000000), // Id for event handlings
		svgWidth: 400,
		svgHeight: 400,
		marginTop: 5,
		marginBottom: 5,
		marginRight: 5,
		marginLeft: 5,
    container: 'body',
    radius_org: 13,
    radius_people: 8,
		defaultTextFill: '#2C3E50',
    defaultFont: 'Helvetica',
    colors:  ["#B0E2A7","#19494D","#D0BAE8","#53B8C6","#B83D54","#7A4B29","#286C77","#0E112A","#866ECF","#80CB62","#3B8BB0","#DBDB94","#D6BA85","#B3CC66","#E4B6E7","#79D2AD","#BD6ACD","#DEB99C","#B4E6B3","#2D5986","#79ACD2","#B147C2","#B8853D","#799130","#2D3986"],
    data: null,
    mode: 'first',
    openNav: d => d,
    closeNav: d => d
  };

  var toggle = null;

	//Main chart object
	var main = function() {
		//Drawing containers
		var container = d3.select(attrs.container);

		//Calculated properties
		var calc = {};
		calc.id = 'ID' + Math.floor(Math.random() * 1000000); // id for event handlings
		calc.chartLeftMargin = attrs.marginLeft;
		calc.chartTopMargin = attrs.marginTop;
		calc.chartWidth = attrs.svgWidth - attrs.marginRight - calc.chartLeftMargin;
		calc.chartHeight = attrs.svgHeight - attrs.marginBottom - calc.chartTopMargin;
    
    var clusterNames = attrs.data.nodes
      .filter(x => x.group.length)
      .map(x => x.group.trim())
      .filter((d, i, arr) => arr.indexOf(d) === i);

    var padding = 1.5, // separation between same-color nodes
        clusterPadding = 20, // separation between different-color nodes
        maxRadius = attrs.radius_org,
        m = clusterNames.length,
        color = d3.scale.ordinal().range(attrs.colors).domain(d3.range(m)),
        clusters = new Array(m), // The largest node for each cluster.
        nodes_first, links_first = [],
        nodes_second, links_second;

    let zoom = d3.behavior.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", zoomed)

    nodes_first = attrs.data.nodes.filter(d => d.type !== 'organization')
      .map(function(x) {
        if (!x.group.trim().length) return;
        var i = clusterNames.indexOf(x.group);
        var r = Math.sqrt((i + 1) / m * -Math.log(Math.random())) * maxRadius,
            d = Object.assign(x, {cluster: i, radius: attrs.radius_people});
        if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
        return d;
      }).filter(x => x);

    nodes_second = attrs.data.nodes.filter(x => {
      return (attrs.data.links.some(d => d.source === x.node || d.target === x.node));
    }).map(d => {
      d.radius = d.type === 'organization' ? attrs.radius_org : attrs.radius_people
      return d;
    });

    links_second = attrs.data.links.map(x => {
      return {
        source: attrs.data.nodes.filter(d => d.node === x.source)[0],
        target: attrs.data.nodes.filter(d => d.node === x.target)[0],
        type: x.type
      }
    })
    
    // Use the pack layout to initialize node positions.
    d3.layout.pack()
      .sort(null)
      .size([calc.chartWidth, calc.chartHeight])
      .children(function(d) { return d.values; })
      .value(function(d) { return d.radius * d.radius; })
      .nodes({values: d3.nest().key(function(d) { return d.cluster; }).entries(nodes_first)});

    var force = d3.layout.force()
      .nodes(getNodes())
      .links(getLinks())
      .size([calc.chartWidth, calc.chartHeight])
      .gravity(.02)
      .charge(0)
      .on("tick", tick)
      .start();

		//Add svg
		var svg = container
			.patternify({ tag: 'svg', selector: 'svg-chart-container' })
			.attr('width', attrs.svgWidth)
			.attr('height', attrs.svgHeight)
      .attr('font-family', attrs.defaultFont)
        .on("dblclick.zoom", null)
        .call(zoom);

		//Add container g element
		var chart = svg
			.patternify({ tag: 'g', selector: 'chart' })
      .attr('transform', 'translate(' + calc.chartLeftMargin + ',' + calc.chartTopMargin + ')');
    
    var linksGroup = chart.patternify({ tag: 'g', selector: 'links' });
    var nodesGroup = chart.patternify({ tag: 'g', selector: 'nodes' });
    
    var node = addNodes();
    var link = addLinks();

    toggle = function (mode) {
      attrs.mode = mode;

      node = addNodes();
      link = addLinks();

      force.stop();

      force.nodes(getNodes())
        .links(getLinks())
        .start();
    }

    function tick(e) {
      if (attrs.mode === 'first') {
        node
          .each(cluster(10 * e.alpha * e.alpha))
          .each(collide(.5))
      }

      node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

      link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    }

    //Zoom functions
    function zoomed () {
      chart.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
      // currentScale = d3.event.transform.k;
      // updateStylesOnZoom(currentScale);
    }

    function getNodes () {
      return attrs.mode === 'first' ? nodes_first : nodes_second;
    }

    function getLinks () {
      return attrs.mode === 'first' ? links_first : links_second;
    }

    function addLinks () {
      return linksGroup.html("").patternify({ tag: 'line', selector: 'link', data: getLinks() })
        .attr("stroke-width", 1)
        .attr("stroke", '#666')
        .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);
    }

    function addNodes () {
      var nd = nodesGroup.html("").patternify({ tag: 'circle', selector: 'node-circle', data: getNodes() })
        .style("fill", function(d) { return color(d.cluster); })
        .on('click', function(d) {
          if (d.clicked) {
            d.clicked = false
            attrs.closeNav(d)
          } else {
            d.clicked = true
            attrs.openNav(d)
          }
        })
      
      if (attrs.mode === 'first') {
        nd.transition()
          .duration(750)
          .delay(function(d, i) { return i * 5; })
          .attrTween("r", function(d) {
            var i = d3.interpolate(0, d.radius);
            return function(t) { return d.radius = i(t); };
          });
        } else {
          nd.attr("r", d => d.radius)  
        }

      return nd;
    }

    // Move d to be adjacent to the cluster node.
    function cluster(alpha) {
      return function(d) {
        var cluster = clusters[d.cluster];
        if (cluster === d) return;
        var x = d.x - cluster.x,
            y = d.y - cluster.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + cluster.radius;
        if (l != r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          cluster.x += x;
          cluster.y += y;
        }
      };
    }

    // Resolves collisions between d and all other circles.
    function collide(alpha) {
      var quadtree = d3.geom.quadtree(getNodes());
      return function(d) {
        var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      };
    }
	};

  // window resize event
  d3.select(window).on('resize.' + attrs.id, function() {
    var containerRect = d3.select(attrs.container).node().getBoundingClientRect();
    if (containerRect.width > 0) attrs.svgWidth = containerRect.width;
    d3.select(attrs.container).select('.svg-chart-container').attr('width', attrs.svgWidth);
  });

	//----------- PROTOTYPE FUNCTIONS  ----------------------
	d3.selection.prototype.patternify = function(params) {
		var container = this;
		var selector = params.selector;
		var elementTag = params.tag;
		var data = params.data || [ selector ];

		// Pattern in action
		var selection = container.selectAll('.' + selector).data(data, (d, i) => {
			if (typeof d === 'object') {
				if (d.id) {
					return d.id;
				}
			}
			return i;
		});
		selection.exit().remove();
		selection = selection.enter().append(elementTag);
		selection.attr('class', selector);
		return selection;
	};

	//Dynamic keys functions
	Object.keys(attrs).forEach((key) => {
		// Attach variables to main function
		return (main[key] = function(_) {
			var string = `attrs['${key}'] = _`;
			if (!arguments.length) {
				return eval(` attrs['${key}'];`);
			}
			eval(string);
			return main;
		});
	});

	//Set attrs as property
  main.attrs = attrs;
  
  main.toggle = function (mode) {
    if (typeof toggle === 'function') {
      toggle(mode);
    }
    return main;
  }

	//Exposed update functions
	main.data = function(value) {
		if (!arguments.length) return attrs.data;
		attrs.data = value;
		return main;
	};

	// Run  visual
	main.render = function() {
		main();
		return main;
	};

	return main;
}