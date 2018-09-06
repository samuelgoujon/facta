function renderChart(params) {

  // Exposed variables
  var attrs = {
    id: "ID" + Math.floor(Math.random() * 1000000),  // Id for event handlings
    svgWidth: 400,
    svgHeight: 400,
    marginTop: 0,
    marginBottom: 0,
    marginRight: 0,
    marginLeft: 0,
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
    }
  ]

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

      let padding = 55, clusterPadding = 100;
      let line = d3.line().curve(d3.curveCatmullRomClosed)
      let color = d3.scaleOrdinal(d3.schemeCategory10)

      let zoom = d3.zoom()
          .scaleExtent([0.1, 10])
          .on("zoom", zoomed)

      let clusters = {};
      attrs.data.nodes.forEach(d => {
          let religion = religions.filter(x => x.name == d.religion);
          const i = Math.floor(Math.random() * clusters.length)
          d.radius = d.type == 'people' ? attrs.circleRadiusPeople : attrs.circleRadiusOrganizaion
          d.x = Math.cos(i / clusters.length * 2 * Math.PI) * 600 + calc.chartWidth / 2 + Math.random(),
          d.y = Math.sin(i / clusters.length * 2 * Math.PI) * 600 + calc.chartHeight / 2 + Math.random()
          d.clusters = getGroups(d)
          d.tag = religion.length ? 'image' : 'circle';
          d.isImage = religion.length ? true : false;
          d.imagePath = religion.length ? 'img/' + religion[0].filename : null
          d.clusters.forEach(cluster => {
            if (!clusters[cluster] || (d.radius > clusters[cluster].radius)) clusters[cluster] = d;
          })
        })

      function getGroups(d) {
        if (!d.group.length) {
          return []
        }
        return d.group.split(',').map(x => x.trim())
      }

      var simulation = d3.forceSimulation()
          .alpha(0.3)
          .force("center", d3.forceCenter().x(calc.chartWidth / 2).y(calc.chartHeight / 2))
          .force('collide', d3.forceCollide(d => d.radius + padding))
          .nodes(attrs.data.nodes)
          .on("tick", ticked)

      simulation.force("link", d3.forceLink().id(d => d.node).links(attrs.data.links))

      simulation.restart();

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

      var tooltip = d3
        .componentsTooltip()
        .container(svg)
        .textColor('#fff')
        .content([
          {
            left: "{g}"
            /*center: "{g}"*/
          }
        ]);

      var hullsGroup = chart.patternify({ tag: 'g', selector: 'hulls' })
      var linksGroup = chart.patternify({ tag: 'g', selector: 'links' })
      var nodesGroup = chart.patternify({ tag: 'g', selector: 'nodes' })

      var link = linksGroup.patternify({ tag: 'line', selector: 'link', data: attrs.data.links })
        .attr("stroke-width", d => 1)
        .attr("stroke", '#ccc')
        .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);

      var node = nodesGroup.patternify({ tag: 'g', selector: 'node', data: attrs.data.nodes })
          .attr('data-group', d => d.group)

      node.each(function(d) {
        let that = d3.select(this);

        if (d.isImage) {
          that.append('image')
          .attr('href', d => d.imagePath)
          .attr('width', attrs.circleRadiusPeople * 3)
          .attr('height', attrs.circleRadiusPeople * 3)
          .classed('node-icon', true)
        } else {
          that.append('circle')
          .attr("r", d => d.radius)
          .attr('data-name', d => d.node)
          .attr("stroke-width", 1.5)
          .attr("stroke", 'black')
          .attr('class', d => `node-circle node-${d.type}`)
          .classed('node-icon', true)
          .attr('fill', d => {
            if (d.clusters.length == 0) return '#ccc'
            if (d.clusters.length == 1) {
              return color(d.clusters[0])
            }
            return d3.interpolateRgb(color(d.clusters[0]), color(d.clusters[1]))(0.5)
          })
        }

        that.select('.node-icon')
        .on('click', function(d) {
          if (d.clicked) {
            d.clicked = false
            attrs.closeNav(d)
          } else {
            d.clicked = true
            attrs.openNav(d)
          }
        })
        // .call(d3.drag()
        //         .on("start", dragstarted)
        //         .on("drag", dragged)
        //         .on("end", dragended));
      })

      var hull = hullsGroup.patternify({ tag: 'path', selector: 'hull', data: Object.keys(clusters).map(c => {
          return {
            cluster: c,
            nodes: node.filter(d => d.clusters.indexOf(c) > -1)
          };
        }) })
      .attr("d", d => {
        return line(d3.polygonHull(hullPoints(d.nodes)))
      })
      .attr('data-group', d => d.group)
      .attr("fill", d => color(d.cluster))
      .attr('opacity', 0.4)
      .on('mouseover', function(d) {
        var mouse = d3.mouse(svg.node());

        tooltip
          .x(mouse[0])
          .y(mouse[1])
          .tooltipFill(color(d.cluster))
          .show({ g: d.cluster });
      })
      .on('mouseout', function() {
        tooltip
          .hide();
      });

      node.patternify({ tag: 'text', selector: 'node-text', data: d => [d] })
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.type == "people" ? attrs.circleRadiusPeople + 30 : attrs.circleRadiusOrganizaion + 30)
        .attr('y', 0)
        .text(d => d.node || d.group)

      // node.selectAll('text.node-text')
      //     .call(wrap, attrs.circleRadiusOrganizaion * 2)

        function ticked() {
          hull
            .attr('d', d => line(d3.polygonHull(hullPoints(d.nodes))));

          node
            .each(cluster(0.1))
            .each(collide(0.1))
            .attr('transform', d => `translate(${d.x}, ${d.y})`)

          link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        }

        function hullPoints(data) {
          let pointArr = [];
          const padding = 5;
          data.each(d => {
            const pad = d.radius + padding;
            pointArr = pointArr.concat([
              [d.x - pad, d.y - pad],
              [d.x - pad, d.y + pad],
              [d.x + pad, d.y - pad],
              [d.x + pad, d.y + pad]
            ]);
          });
          return pointArr;
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

        function collide(alpha) {

          const quadtree = d3.quadtree()
            .x(function (d) { return d.x; })
            .y(function (d) { return d.y; })
            .extent([[0, 0], [calc.chartWidth, calc.chartHeight]])
            .addAll(attrs.data.nodes);

          return function (d) {
            let r = d.radius + (attrs.circleRadiusOrganizaion * 8) + Math.max(padding, clusterPadding),
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
              let data = quad.data;
              if (data && data !== d) {
                let x = d.x - data.x,
                    y = d.y - data.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + data.radius + (d.cluster == data.cluster ? padding : clusterPadding);
                if (l < r) {
                  l = (l - r) / l * alpha;
                  d.x -= x *= l;
                  d.y -= y *= l;
                  data.x += x;
                  data.y += y;
                }
              }
              return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
          };
        }

        function cluster(alpha) {
          return function (d) {
            if (!d.clusters.length) return;
              let cluster = clusters[d.clusters[0]];
              if (cluster === d) return;
              let x = d.x - cluster.x,
                  y = d.y - cluster.y,
                  l = Math.sqrt(x * x + y * y),
                  r = d.radius + cluster.radius + 3;
              if (l != r) {
                l = (l - r) / l * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                cluster.x += x;
                cluster.y += y;
              }
          };
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

      //Zoom functions
      function zoomed() {
        chart.attr("transform", d3.event.transform)
      }

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
