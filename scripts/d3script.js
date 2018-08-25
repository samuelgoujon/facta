function renderChart(params) {

  // Exposed variables
  var attrs = {
    id: "ID" + Math.floor(Math.random() * 1000000),  // Id for event handlings
    svgWidth: 400,
    svgHeight: 400,
    marginTop: 5,
    marginBottom: 5,
    marginRight: 5,
    marginLeft: 5,
    circleRadiusOrganizaion: 16,
    circleRadiusPeople: 8,
    circleRadiusGroup: 20,
    container: 'body',
    defaultTextFill: '#2C3E50',
    defaultFont: 'Helvetica',
    data: null,
    openNav: d => d,
    closeNav: d => d,
  };


  //InnerFunctions which will update visuals
  var updateData;

  //Main chart object
  var main = function (selection) {
    selection.each(function scope() {

      //Calculated properties
      var calc = {}
      calc.id = "ID" + Math.floor(Math.random() * 1000000);  // id for event handlings
      calc.chartLeftMargin = attrs.marginLeft;
      calc.chartTopMargin = attrs.marginTop;
      calc.chartWidth = attrs.svgWidth - attrs.marginRight - calc.chartLeftMargin;
      calc.chartHeight = attrs.svgHeight - attrs.marginBottom - calc.chartTopMargin;
      let expand = {};
      let net;
      let line = d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRomClosed)
      let color = d3.scaleOrdinal(d3.schemeCategory10)

      let zoom = d3.zoom()
          .scaleExtent([0.1, 10])
          .on("zoom", zoomed)
        
      var simulation = d3.forceSimulation()
          .force("link", d3.forceLink().distance((l, i) => {
            var n1 = l.source, n2 = l.target;
            // larger distance for bigger groups:
            // both between single nodes and _other_ groups (where size of own node group still counts),
            // and between two group nodes.
            //
            // reduce distance for groups with very few outer links,
            // again both in expanded and grouped form, i.e. between individual nodes of a group and
            // nodes of another group or other group node or between two group nodes.
            //
            // The latter was done to keep the single-link groups ('blue', rose, ...) close.
            return 50 +
              Math.min(20 * Math.min((n1.size || (n1.group != n2.group ? n1.group_data.size : 0)),
                                     (n2.size || (n1.group != n2.group ? n2.group_data.size : 0))),
                   -30 +
                   30 * Math.min((n1.link_count || (n1.group != n2.group ? n1.group_data.link_count : 0)),
                                 (n2.link_count || (n1.group != n2.group ? n2.group_data.link_count : 0))),
                   100);
            //return 10;
          }))
          .force("charge", d3.forceManyBody())
          .force("center", d3.forceCenter()
                             .x(calc.chartWidth / 2)
                             .y(calc.chartHeight / 2))
          .force("x", d3.forceX(calc.chartWidth / 2))
          .force("y", d3.forceY(calc.chartHeight / 2))
          .force('collision', d3.forceCollide().radius(25).strength(1).iterations(60))

      // constructs the network to visualize
      function network(data, prev, index, expand) {
        expand = expand || {};
        var gm = {},    // group map
            nm = {},    // node map
            lm = {},    // link map
            gn = {},    // previous group nodes
            gc = {},    // previous group centroids
            nodes = [], // output nodes
            links = []; // output links

        // process previous nodes for reuse or centroid calculation
        if (prev) {
          prev.nodes.forEach(function(n) {
            var i = index(n), o;
            if (n.size > 0) {
              gn[i] = n;
              n.size = 0;
            } else {
              o = gc[i] || (gc[i] = {x:0,y:0,count:0});
              o.x += n.x;
              o.y += n.y;
              o.count += 1;
            }
          });
        }

        // determine nodes
        for (var k=0; k < data.nodes.length; ++k) {
          var n = data.nodes[k],
              i = index(n),
              l = gm[i] || (gm[i] = gn[i]) || (gm[i]={ group:i, size: 0, nodes:[]});

          if (expand[i]) {
            // the node should be directly visible
            nm[n.node] = nodes.length;
            nodes.push(n);
            if (gn[i]) {
              // place new nodes at cluster location (plus jitter)
              n.x = gn[i].x + Math.random();
              n.y = gn[i].y + Math.random();
            }
            n.isGroup = false;
          } else {
            // the node is part of a collapsed cluster
            if (l.size == 0) {
              // if new cluster, add to set and position at centroid of leaf nodes
              nm[i] = nodes.length;
              nodes.push(l);
              if (gc[i]) {
                l.x = gc[i].x / gc[i].count;
                l.y = gc[i].y / gc[i].count;
              }
            }
            l.isGroup = true;
            l.nodes.push(n);
          }

          // always count group size as we also use it to tweak the force graph strengths/distances
          l.size += 1;
          n.group_data = l;
        }

        for (i in gm) { gm[i].link_count = 0; }

        // determine links
        for (k=0; k < data.links.length; ++k) {
          var e = data.links[k],
              u = index(e.source),
              v = index(e.target);
          if (u != v) {
            gm[u].link_count++;
            gm[v].link_count++;
          }
          u = expand[u] ? nm[e.source.node] : nm[u];
          v = expand[v] ? nm[e.target.node] : nm[v];
          var i = (u < v ? u + "|" + v : v + "|" + u),
              l = lm[i] || (lm[i] = {source:u, target:v, size:0});
          l.size += 1;
        }
        for (i in lm) { links.push(lm[i]); }

        return { nodes: nodes, links: links };
      }

      function convexHulls(nodes, index, offset) {
        var hulls = {};

        // create point sets
        for (var k=0; k<nodes.length; ++k) {
          var n = nodes[k];
          if (n.size) continue;
          var i = index(n),
              l = hulls[i] || (hulls[i] = []);
          l.push([n.x-offset, n.y-offset]);
          l.push([n.x-offset, n.y+offset]);
          l.push([n.x+offset, n.y-offset]);
          l.push([n.x+offset, n.y+offset]);
        }

        // create convex hulls
        var hullset = [];
        for (i in hulls) {
          hullset.push({group: i, path: d3.polygonHull(hulls[i])});
        }

        return hullset;
      }

      attrs.data.links.forEach(d => {
        let source = d.source;
        let target = d.target;
        d.source = attrs.data.nodes.filter(d => d.node == source)[0]
        d.target = attrs.data.nodes.filter(d => d.node == target)[0]
      })

      //Drawing containers
      var container = d3.select(this);

      //Add svg
      var svg = container.patternify({ tag: 'svg', selector: 'svg-chart-container' })
        .attr('width', attrs.svgWidth)
        .attr('height', attrs.svgHeight)
        .attr('font-family', attrs.defaultFont)
        .call(zoom)
        .on("dblclick.zoom", null)

      //Add container g element
      var chart = svg.patternify({ tag: 'g', selector: 'chart' })
        .attr('transform', 'translate(' + (calc.chartLeftMargin) + ',' + calc.chartTopMargin + ')')
      
      var hullsGroup = chart.patternify({ tag: 'g', selector: 'hulls' })
      var linksGroup = chart.patternify({ tag: 'g', selector: 'links' })
      var nodesGroup = chart.patternify({ tag: 'g', selector: 'nodes' })

      function init() {
        net = network(attrs.data, net, d => d.group, expand);
        simulation
          .nodes(net.nodes)
          .on("tick", ticked);
  
        simulation.force("link")
          .links(net.links);

        simulation.restart();
        
        var hull = hullsGroup.patternify({ tag: 'path', selector: 'hull', data: convexHulls(net.nodes, d => d.group, 15) })
            .attr("d", d => {
              return line(d.path)
            })
            .attr("fill", d => color(d.group))
            .on("click", function(d) {
              expand[d.group] = false; 
              init();
            })
            .call(d3.drag()
              .on('start', group_dragstarted)
              .on('drag', group_dragged)
              .on('end', group_dragended)
              );

        var link = linksGroup.patternify({ tag: 'line', selector: 'link', data: net.links })
          .attr("stroke-width", d => d.size || 1)
          .attr("stroke", '#ccc')
          .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);
        
        var node = nodesGroup.patternify({ tag: 'g', selector: 'node', data: net.nodes })
            .call(d3.drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended));

        node.patternify({ tag: 'circle', selector: 'node-circle', data: d => [d] })
          .attr("r", d => {
            return d.type == "people" ? attrs.circleRadiusPeople : attrs.circleRadiusOrganizaion
          })
          .attr("stroke-width", 1.5)
          .attr("stroke", 'black')
          .attr('class', d => `node-circle node-${d.type}`)
          .on('click', function(d) {
            let that = d3.select(this)
            if (!d.isGroup) {
              let r = (d.type == "people") ? attrs.circleRadiusPeople : attrs.circleRadiusOrganizaion
              if (d.clicked) {
                that.attr('r', r)
                d.clicked = false
                attrs.closeNav(d)
              } else {
                that.attr('r', r + 10)
                d.clicked = true
                attrs.openNav(d)
              }
            }
          })
          .on('dblclick', function(d) {
            expand[d.group] = !expand[d.group];
            init();
          })
          .attr('fill', d => color(d.group))

        // node.patternify({ tag: 'text', selector: 'node-text', data: d => [d] })
        //   .attr('text-anchor', 'middle')
        //   .attr('dy', d => d.type == "people" ? attrs.circleRadiusPeople + 30 : attrs.circleRadiusOrganizaion + 30)
        //   .attr('y', 0)
        //   .text(d => d.node || d.group)
          
        // node.selectAll('text.node-text')
        //     .call(wrap, attrs.circleRadiusOrganizaion * 2)

        function ticked() {
          if (!hull.empty()) {
            hull.data(convexHulls(net.nodes, d => d.group, 15))
                .attr("d", d => line(d.path));
          }

          link
              .attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });
  
          node.attr('transform', d => `translate(${d.x}, ${d.y})`)
        }
  
        function dragstarted(d) {
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }
  
        function dragged(d) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }
  
        function dragended(d) {
          if (!d3.event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        // drag groups
        function group_dragstarted(groupId) {
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          d3.select(this).select('path').style('stroke-width', 3);
        }

        function group_dragged(groupId) {
          node
            .filter(function(d) { return d.group == groupId; })
            .each(function(d) {
              d.x += d3.event.dx;
              d.y += d3.event.dy;
            })
        }

        function group_dragended(groupId) {
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          d3.select(this).select('path').style('stroke-width', 1);
        }

        function wrap(text, width) {
          text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(" "));
              if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
              }
            }
          });
        }
      }

      //Zoom functions
      function zoomed() {
        chart.attr("transform", d3.event.transform)
      }

      // initilize the chart
      init();

      // Smoothly handle data updating
      updateData = function () {

      }

      handleWindowResize();


      //#########################################  UTIL FUNCS ##################################
      function handleWindowResize() {
        d3.select(window).on('resize.' + attrs.id, function () {
          setDimensions();
        });
      }


      function setDimensions() {
        setSvgWidthAndHeight();
        container.call(main);
      }

      function setSvgWidthAndHeight() {
        var containerRect = container.node().getBoundingClientRect();
        if (containerRect.width > 0)
          attrs.svgWidth = containerRect.width;
        if (containerRect.height > 0)
          attrs.svgHeight = containerRect.height;
      }


      function debug() {
        if (attrs.isDebug) {
          //Stringify func
          var stringified = scope + "";

          // Parse variable names
          var groupVariables = stringified
            //Match var x-xx= {};
            .match(/var\s+([\w])+\s*=\s*{\s*}/gi)
            //Match xxx
            .map(d => d.match(/\s+\w*/gi).filter(s => s.trim()))
            //Get xxx
            .map(v => v[0].trim())

          //Assign local variables to the scope
          groupVariables.forEach(v => {
            main['P_' + v] = eval(v)
          })
        }
      }
      debug();
    });
  };

  //----------- PROTOTYEPE FUNCTIONS  ----------------------
  d3.selection.prototype.patternify = function (params) {
    var container = this;
    var selector = params.selector;
    var elementTag = params.tag;
    var data = params.data || [selector];

    // Pattern in action
    var selection = container.selectAll('.' + selector).data(data, (d, i) => {
      if (typeof d === "object") {
        if (d.id) {
          return d.id;
        }
        if (d.node) {
          return d.node;
        }
        if (d.group) {
          return d.group;
        }
      }
      return i;
    })
    selection.exit().remove();
    selection = selection.enter().append(elementTag).merge(selection)
    selection.attr('class', selector);
    return selection;
  }

  //Dynamic keys functions
  Object.keys(attrs).forEach(key => {
    // Attach variables to main function
    return main[key] = function (_) {
      var string = `attrs['${key}'] = _`;
      if (!arguments.length) { return eval(` attrs['${key}'];`); }
      eval(string);
      return main;
    };
  });

  //Set attrs as property
  main.attrs = attrs;

  //Debugging visuals
  main.debug = function (isDebug) {
    attrs.isDebug = isDebug;
    if (isDebug) {
      if (!window.charts) window.charts = [];
      window.charts.push(main);
    }
    return main;
  }

  //Exposed update functions
  main.data = function (value) {
    if (!arguments.length) return attrs.data;
    attrs.data = value;
    if (typeof updateData === 'function') {
      updateData();
    }
    return main;
  }

  // Run  visual
  main.run = function () {
    d3.selectAll(attrs.container).call(main);
    return main;
  }

  return main;
}
