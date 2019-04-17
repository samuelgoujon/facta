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
    radius_org: 20,
    radius_people: 8,
    iconSize: 20,
    nodesFontSize: 12,
		defaultTextFill: '#2C3E50',
    defaultFont: 'Helvetica',
    color_org: '#cccccc',
    colors:  [
      "#B0E2A7","#19494D",
      "#D0BAE8","#53B8C6",
      "#B83D54","#7A4B29",
      "#286C77","#0E112A",
      "#866ECF","#80CB62",
      "#3B8BB0","#DBDB94",
      "#D6BA85","#B3CC66",
      "#E4B6E7","#79D2AD",
      "#BD6ACD","#DEB99C",
      "#B4E6B3","#2D5986",
      "#79ACD2","#B147C2",
      "#B8853D","#799130",
      "#2D3986"
    ],
    data: null,
    mode: 'first',
    openNav: d => d,
    closeNav: d => d
  };

  var religions = [
    {
      name: 'Islam',
      filename: 'islam.svg'
    },
    {
      name: 'Judaïsme',
      filename: 'judaism.svg'
    },
    {
      name: 'Grand Orient de France',
      filename: 'freemasonry.svg'
    },
    {
      name: 'Grande Loge nationale française',
      filename: 'freemasonry.svg'
    }
  ]

  var toggle = null;
  let currentScale = 1;

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

    var strokeWidth = 0.5;
    var clusterNames = attrs.data.nodes
      .filter(x => x.group.length)
      .map(x => x.group.trim())
      .filter((d, i, arr) => arr.indexOf(d) === i);

    var padding = 1.5 + strokeWidth, // separation between same-color nodes
        clusterPadding = 20, // separation between different-color nodes
        maxRadius = attrs.radius_org,
        m = clusterNames.length,
        color = d3.scale.ordinal().range(attrs.colors).domain(d3.range(m)),
        clusters = new Array(m), // The largest node for each cluster.
        nodes_first, links_first = [],
        nodes_second, links_second;

    let selectedNode;

    let zoom = d3.behavior.zoom()
      .scaleExtent([0.5, 10])
      .on("zoom", zoomed)

    attrs.data.nodes.forEach(d => {
      var religion = religions.filter(x => x.name == d.religion);
      d.tag = religion.length ? 'image' : 'circle';
      d.isImage = religion.length ? true : false;
      d.imagePath = religion.length ? 'img/' + religion[0].filename : null;
      d.radius = d.type === 'organization' ? attrs.radius_org : attrs.radius_people;
    });

    nodes_first = attrs.data.nodes
      .map(function(x) {
        if (!x.group.trim().length) return;
        var i = clusterNames.indexOf(x.group);
        var d = Object.assign(x, {
              cluster: i,
              radius: attrs.radius_people,
            });

        if (!clusters[i] || (d.radius > clusters[i].radius)) clusters[i] = d;
          return d;
        }).filter(x => x);

    var organizations = attrs.data.nodes.filter(d => d.type == 'organization')

    nodes_second = attrs.data.nodes.filter(x => {
      return (attrs.data.links.some(d => d.source === x.node || d.target === x.node));
    });

    links_second = attrs.data.links.map(x => {
      var source = attrs.data.nodes.filter(d => d.node === x.source)[0];
      var target = attrs.data.nodes.filter(d => d.node === x.target)[0];

      return {
        source: source ? source : null,
        target: target ? target : null,
        type: x.type
      }
    }).filter(x => x.source != null && x.target != null)

    if (attrs.mode == 'first') {
      // Use the pack layout to initialize node positions.
      d3.layout.pack()
        .sort(null)
        .size([calc.chartWidth, calc.chartHeight])
        .children(function(d) { return d.values; })
        .value(function(d) { return d.radius * d.radius; })
        .nodes({values: d3.nest().key(function(d) { return d.cluster; }).entries(nodes_first)});
    }

    var force = d3.layout.force()
      .nodes(getNodes())
      .links(getLinks())
      .size([calc.chartWidth, calc.chartHeight])
      .on("tick", tick);

    if (attrs.mode == 'first') {
      force
        .gravity(.02)
        .charge(0)
    }

    force.start();

		//Add svg
		var svg = container
			.patternify({ tag: 'svg', selector: 'svg-chart-container' })
			.attr('width', attrs.svgWidth)
			.attr('height', attrs.svgHeight)
      .attr('font-family', attrs.defaultFont)
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')
        .call(zoom);

		//Add container g element
		var chart = svg
			.patternify({ tag: 'g', selector: 'chart' })
      .attr('transform', 'translate(' + calc.chartLeftMargin + ',' + calc.chartTopMargin + ')');

    var linksGroup = chart.patternify({ tag: 'g', selector: 'links' });
    var nodesGroup = chart.patternify({ tag: 'g', selector: 'nodes' });

    var node = addNodes();
    var link = addLinks();
    var texts = addTexts();

    toggle = function (mode) {
      attrs.mode = mode;

      force.stop();

      force.nodes(getNodes())
        .links(getLinks())

      node = addNodes();
      link = addLinks();
      texts = addTexts();

      if (attrs.mode == 'first') {
        force
          .gravity(.02)
          .charge(0)

        node.on('mousedown.drag', null)
          .on("mousedown", null);
      } else {
        force
          .gravity(0.05)
          .distance(80)
          .charge(-100)

        node.call(force.drag)
          .on("mousedown", function() { d3.event.stopPropagation(); });
      }

      force.start();

      updateStylesOnZoom(currentScale);
    }

    function tick(e) {
      if (attrs.mode === 'first') {
        node
          .each(cluster(10 * e.alpha * e.alpha))
          .each(collide(.5))
      } else {
        node
        .each(collide(.5))
        // .each(function(d, i) {
        //   if (d.type === 'organization') {
        //     if (organizations.length == 1) {
        //       d.x = calc.chartWidth / 2;
        //       d.y = calc.chartHeight / 2;
        //     } else {
        //       var angle = i * (Math.PI * 2) / organizations.length;
        //       d.x = Math.cos(angle) * calc.chartHeight / 3 + calc.chartWidth / 2;
        //       d.y = Math.sin(angle) * calc.chartHeight / 3 + calc.chartHeight / 2;
        //     }
        //   }
        // })
      }

      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      })

      link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    }

    //Zoom functions
    function zoomed () {
      chart.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
      currentScale = d3.event.scale;
      updateStylesOnZoom(currentScale);
    }

    function getNodes () {
      return attrs.mode === 'first' ? nodes_first : nodes_second;
    }

    function getLinks () {
      return attrs.mode === 'first' ? links_first : links_second;
    }

    function addTexts() {
      return node.patternify({ tag: 'text', selector: 'node-text', data: d => [d] })
        .attr('text-anchor', 'middle')
        .attr('display', 'none')
        .attr('font-weight', d => d.type === 'organization' ? 'bold' : null)
        .attr('font-size', attrs.nodesFontSize + 'px')
        .attr('dy', d => d.radius + 15)
        .text(d => d.node || d.group)
    }

    function addLinks () {
      return linksGroup.html("").patternify({ tag: 'line', selector: 'link', data: getLinks() })
        .attr("stroke-width", 1)
        .attr("stroke", '#666')
        .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);
    }

    function addNodes () {
      var node = nodesGroup.html("").patternify({ tag: 'g', selector: 'node', data: getNodes() })
          .attr('data-group', d => d.group)
          .attr('class', function (d) {
            var cl = 'node node-' + d.type;
            return cl;
          })

      var nd = node.patternify({ tag: 'circle', selector: 'node-circle', data: d => [d] })
        .style("fill", function(d) {
          if (d.isImage) {
            return '#fff';
          }
          if (d.type === 'organization') {
            return attrs.color_org;
          }
          return color(d.cluster);
        })
        .attr("stroke-width", strokeWidth)
        .attr("stroke", d => d.isImage ? null : '#666')
        .attr("r", d => d.radius / currentScale)
        .on('click', function(d) {
          var el = d3.select(this)
          if (d.clicked) {
            d.clicked = false
            el.attr("r", d => d.radius / currentScale).classed('selected', false)
            attrs.closeNav(d);
            deselectConnectedLinks(d);
            selectedNode = null;
          } else {
            d.clicked = true
            el.attr("r", d => (d.radius / currentScale) * 1.4).classed('selected', true);
            attrs.openNav(d)
            selectConnectedLinks(d);
            selectedNode = d;
            updateStylesOnZoom(currentScale);
          }
        })
        .on('mouseover', function (d) {
          d3.select(this)
            .style('cursor', 'pointer')
            .attr('stroke-width', (strokeWidth + 1) / currentScale);

          var parent = d3.select(this.parentElement).each(function() {
            this.parentNode.appendChild(this);
          });

          var text = parent.select('.node-text')

          text.attr('display', null)

          if (d.type === 'people') {
            text.attr('font-weight', 'bold')
          }
        })
        .on('mouseout', function (d) {
          d3.select(this)
            .style('cursor', null)
            .attr('stroke-width', strokeWidth / currentScale);

          var parent = d3.select(this.parentElement);
          var text = parent.select('.node-text');

          if (currentScale < 3) {
            text.attr('display', 'none');
          }

          if (d.type === 'people') {
            text.attr('font-weight', null)
          }
        })

      node.filter(x => x.isImage)
        .each(function () {
          let that = d3.select(this);

          that.append('image')
            .attr('xlink:href', d => d.imagePath)
            .attr('width', d => d.radius * 2)
            .attr('height', d => d.radius * 2)
            .attr('transform', d => `translate(${-d.radius}, ${-d.radius})`)
            .classed('node-icon', true)
            .attr('pointer-events', 'none')
        })

      return node;
    }

    function selectConnectedLinks (d) {
      var links = getLinks();
      var connectedLinks = [];

      links.forEach(x => {
        if (x.source == d || x.target == d) {
          connectedLinks.push(x);
        }
      })

      link.filter(x => {
        return connectedLinks.indexOf(x) > -1;
      })
      .attr('stroke-width', 2 / currentScale);
    }

    function deselectConnectedLinks (d) {
      var links = getLinks();
      var connectedLinks = [];

      links.forEach(x => {
        if (x.source == d || x.target == d) {
          connectedLinks.push(x);
        }
      })

      link.filter(x => {
        return connectedLinks.indexOf(x) > -1;
      })
      .attr('stroke-width', 2 / currentScale);
    }

    function updateStylesOnZoom (scale) {
      if (scale < 2) {
          texts.attr('display', 'none')
      }
      else {
          texts.attr('display', null)
      }

      let fontSize = attrs.nodesFontSize / scale;

      texts
          .attr('dy', d => d.isImage ? (d.radius * 2 + 20) / scale : (d.radius + 20) / scale)
          .attr('font-size', fontSize + 'px')

      link.attr('stroke-width', d => {
        if (selectedNode) {
          if (d.source == selectedNode || d.target == selectedNode) {
            return 2 / scale;
          }
        }
        
        return 1 / scale;
      })

      node.each(function () {
        let self = d3.select(this);
        let circle = self.select('circle')

        self
          .select('image')
          .attr('width', d => d.radius * 2 / scale)
          .attr('height', d => d.radius * 2 / scale)
          .attr('transform', d => `translate(${-d.radius / scale}, ${-d.radius / scale})`)

        circle.attr('stroke-width', strokeWidth / scale);
        circle.attr('r', d => d.radius / scale);
      })
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
    // main();
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

  main.currentScale = function () {
    return currentScale;
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
