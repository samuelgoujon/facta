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
      
      let line = d3.line().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRomClosed)
      let color = d3.scaleOrdinal(d3.schemeCategory10)

      let expand = {};

      let zoom = d3.zoom()
          .scaleExtent([0.1, 10])
          .on("zoom", zoomed)
        
      var simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(d => d.node).distance((l, i) => {
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
            // return 50 +
            //   Math.min(20 * Math.min((n1.size || (n1.group != n2.group ? n1.group_data.size : 0)),
            //                          (n2.size || (n1.group != n2.group ? n2.group_data.size : 0))),
            //        -30 +
            //        30 * Math.min((n1.link_count || (n1.group != n2.group ? n1.group_data.link_count : 0)),
            //                      (n2.link_count || (n1.group != n2.group ? n2.group_data.link_count : 0))),
            //        100);
            return 10;
          }))
          .force("charge", d3.forceManyBody())
          .force("center", d3.forceCenter()
                             .x(calc.chartWidth / 2)
                             .y(calc.chartHeight / 2))
          .force("x", d3.forceX(calc.chartWidth / 2))
          .force("y", d3.forceY(calc.chartHeight / 2))
          .force('collision', d3.forceCollide().radius(25).strength(1).iterations(60))

      // constructs the network to visualize
      function network(previousNodes) {
        var groupMap = {},    // group map
            nodeMap = [],    // node map
            nodes = [], // output nodes
            links = []; // output links

        attrs.data.nodes.forEach(d => {
            // split the group string by comma
            let g = d.group.split(',');
            
            let node = {
              ...d,
              isGroup: false,
              groups: g.map(d => d.trim()) // groups that the node belongs to
            }
            // append the node to the node map
            nodeMap.push(node)
            // iterate over the groups array
            g.forEach(k => {
              // let group = previousNodes.filter(x => x.node == k)
              // if (group.length) {
              //   node.x = group[0].x
              //   node.y = group[0].y
              //   node.fx = group[0].fx
              //   node.fy = group[0].fy
              // }
              // some groups may have preciding or trailing whitespace, so trim them
              k = k.trim()
              let groups = nodes.filter(d => d.group == k && d.isGroup);
              // if we already have the group, we should append the node to the nodes array
              if (groups.length) {
                groups[0].nodes.push(node)
              } else {
                if (expand[k]) {
                  nodes.push(node);
                } else {
                  // create a new group
                  let group = {
                    group: k,
                    node: k,
                    isGroup: true,
                    nodes: [
                      node
                    ]
                  }
                  // append new group
                  nodes.push(group)
                  // append the group to the group map
                  groupMap[k] = group
                }
              }
            })
        })
        
        attrs.data.links.forEach((d, i) => {
          let sourceNodeInitial = nodeMap.filter(x => x.node == d.source.node)[0]
          let targetNodeInitial = nodeMap.filter(x => x.node == d.target.node)[0]

          let sourceNodes = [], targetNodes = [], linkCount = 1;

          sourceNodeInitial.groups.forEach(sg => {
            if (expand[sg]) {
              if (sourceNodes.indexOf(sourceNodeInitial) == -1) {
                sourceNodes.push(sourceNodeInitial)
              }
            } else {
              sourceNodes.push(groupMap[sg])
            }
          })
          
          targetNodeInitial.groups.forEach(tg => {
            if (expand[tg]) {
              if (targetNodes.indexOf(targetNodeInitial) == -1) {
                targetNodes.push(targetNodeInitial)
              }
            } else {
              targetNodes.push(groupMap[tg])
            }
          })

          if (sourceNodes.length > 1 || targetNodes.length > 1) {
            debugger
          }

          sourceNodes.forEach(i => {
            let link = {
              source: i,
              linkCount: linkCount
            }
            targetNodes.forEach(j => {
              link.target = j
              links.push(link)
            })
          })
        })

        return { nodes: nodes, links: links };
      }

      function convexHulls(nodes, index, offset) {
        var hulls = {};

        // create point sets
        for (var k = 0; k < nodes.length; ++k) {
          var n = nodes[k];
          if (n.isGroup) continue;
          var i = index(n),
              l = hulls[i] || (hulls[i] = []);

          l.push([n.x - offset, n.y - offset]);
          l.push([n.x - offset, n.y + offset]);
          l.push([n.x + offset, n.y - offset]);
          l.push([n.x + offset, n.y + offset]);
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

      let net;
      function init() {
        net = network(net && net.nodes ? net.nodes : []);

        simulation
          .nodes(net.nodes)
          .on("tick", ticked);
  
        simulation.force("link")
          .links(net.links);

        
        
        var hull = hullsGroup.patternify({ tag: 'path', selector: 'hull', data: convexHulls(net.nodes, d => d.group, 15) })
            .attr("d", d => {
              return line(d.path)
            })
            .attr("fill", d => color(d.group))
            .on("click", function(d) {
              expand[d.group] = false; 
              init();
            })
            // .call(d3.drag()
            //   .on('start', group_dragstarted)
            //   .on('drag', group_dragged)
            //   .on('end', group_dragended)
            //   );

        var link = linksGroup.patternify({ tag: 'line', selector: 'link', data: net.links })
          .attr("stroke-width", d => Math.sqrt(d.linkCount))
          .attr("stroke", '#ccc')
          .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);
        
        var node = nodesGroup.patternify({ tag: 'g', selector: 'node', data: net.nodes })
        .attr('data-group', d => d.group)
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
        
        simulation.restart();

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
