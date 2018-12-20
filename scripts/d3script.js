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
    nodesFontSize: 10,
    mode: 'first',
    data: null,
    openNav: d => d,
    closeNav: d => d,
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
    }
  ]

  var toggle = null;

  //Main chart object
  var main = function (selection) {
    selection.each(function scope() {

      let currentScale = d3.zoomIdentity.k;
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
      });

      var nodes = attrs.data.nodes;
      var links = attrs.data.links;

      if (attrs.mode == 'first') {
        nodes = nodes.filter(d => d.type !== 'organization');
        links = [];
      }

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
          .nodes(nodes)
          .on("tick", ticked);
 
      simulation.force("link", d3.forceLink().id(d => d.node).links(links));

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
            left: "",
            right: "{g}"
          }
        ]);

      var hullsGroup = chart.patternify({ tag: 'g', selector: 'hulls' })
      var linksGroup = chart.patternify({ tag: 'g', selector: 'links' })
      var nodesGroup = chart.patternify({ tag: 'g', selector: 'nodes' })

      var node = addNode();
      var link = addLink();
      var texts = addTexts();

      function addTexts() {
        return node.patternify({ tag: 'text', selector: 'node-text', data: d => [d] })
        .attr('text-anchor', 'middle')
        .attr('font-size', attrs.nodesFontSize)
        .attr('dy', d => d.isImage ? attrs.circleRadiusPeople + 15 : d.radius + 15)
        .text(d => d.node || d.group)
      }

      function addLink () {
        return linksGroup.patternify({ tag: 'line', selector: 'link', data: links })
        .attr("stroke-width", d => 1)
        .attr("stroke", '#666')
        .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);
      }

      function addNode () {
        var node = nodesGroup.patternify({ tag: 'g', selector: 'node', data: nodes })
          .attr('data-group', d => d.group)

        node.each(function(d) {
          let that = d3.select(this).html('');

          if (d.isImage) {
            that.append('image')
            .attr('href', d => d.imagePath)
            .attr('width', attrs.circleRadiusPeople * 3)
            .attr('height', attrs.circleRadiusPeople * 3)
            .attr('transform', `translate(${-attrs.circleRadiusPeople * 3 / 2}, ${-attrs.circleRadiusPeople * 3 / 2})`)
            .classed('node-icon', true)
          } else {
            that.append('circle')
            .attr("r", d => d.radius)
            .attr('data-name', d => d.node)
            .attr("stroke-width", 1)
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
            .on('mouseover', function (d) {
              if (!d.isImage) {
                d3.select(this).attr('stroke-width', 2 / currentScale)
              }
            })
            .on('mouseout', function () {
              if (!d.isImage) {
                d3.select(this).attr('stroke-width', 1 / currentScale)
              }
            })
            .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));
          })
        return node;
      }

      var hull = hullsGroup.patternify({ tag: 'path', selector: 'hull', data: Object.keys(clusters).map(c => {
          return {
            cluster: c,
            nodes: node.filter(d => d.clusters.indexOf(c) > -1)
          };
        }) 
      })
      .attr("d", d => {
        return line(d3.polygonHull(hullPoints(d.nodes)))
      })
      .attr('data-group', d => d.group)
      .attr('opacity', 0.4)
      .attr("fill", d => color(d.cluster))
      .on('mouseover', function(d) {
        if (attrs.mode !== 'first') return;

        var mouse = d3.mouse(svg.node());

        tooltip
          .x(mouse[0])
          .y(mouse[1])
          .tooltipFill(color(d.cluster))
          .show({ g: d.cluster });
      })
      .on('mouseout', function() {
        if (attrs.mode !== 'first') return;

        tooltip
          .hide();
      })

      function ticked() {
        hull
          .attr('d', d => line(d3.polygonHull(hullPoints(d.nodes))));


        node
          .each(cluster(0.1))
          .each(collide(0.5))
          .attr('transform', d => `translate(${d.x}, ${d.y})`)

        link
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
      }

      toggle = function (mode) {
        attrs.mode = mode;

        if (mode === 'first') {
          nodes = attrs.data.nodes.filter(d => d.type !== 'organization');
          links = [];

          hull.transition()
            .duration(1000)
            .attr('opacity', 0.4)
          
          link
            .transition()
            .duration(1000)
            .attr('opacity', 0.4)
        } else {
          nodes = attrs.data.nodes.filter(x => {
            return (attrs.data.links.some(d => (typeof d.source === 'string' ? d.source : d.source.node) === x.node) 
                || x.type === 'organization');
          }).map(x => {
            return Object.assign(x, { 
              x: null,
              y: null
             })
          });
          links = attrs.data.links;

          hull.transition()
            .duration(750)
            .attr('opacity', 0)
          
          link
            .transition()
            .duration(750)
            .attr('opacity', 0)
        }
        
        simulation.nodes(nodes)
          .force("link", d3.forceLink().id(d => d.node).links(links))
          .alpha(0.3)
          .restart();

        node = addNode();
        link = addLink();
        texts = addTexts();
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

      //Zoom functions
      function zoomed() {
        chart.attr("transform", d3.event.transform);
        currentScale = d3.event.transform.k;
        updateStylesOnZoom(currentScale);
      }

      function updateStylesOnZoom (scale) {
        if (scale < 1) {
            texts.attr('display', 'none')
        }
        else {
            texts.attr('display', null)
        }

        let fontSize = attrs.nodesFontSize / scale;

        texts
            .attr('dy', d => d.isImage ? (attrs.circleRadiusPeople + 15) / scale : (d.radius + 15) / scale)
            .attr('font-size', fontSize + 'px')

        node.each(function (d) {
          let self = d3.select(this);
          if (d.isImage) {
            self
            .select('image')
            .attr('width', attrs.circleRadiusPeople * 3 / scale)
            .attr('height', attrs.circleRadiusPeople * 3 / scale)
            .attr('transform', `translate(${-(attrs.circleRadiusPeople * 3 / scale) / 2}, ${-(attrs.circleRadiusPeople * 3 / scale) / 2})`)
          } else {
            let circle = self.select('circle')
            circle.attr('stroke-width', 1 / scale);
            circle.attr('r', d => d.radius / scale);
          }
        }) 
    }


      // handleWindowResize();


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

  main.toggle = function (mode) {
    if (typeof toggle === 'function') {
      toggle(mode);
    }
    return main;
  }

  //Exposed update functions
  main.data = function (value) {
    if (!arguments.length) return attrs.data;
    attrs.data = value;
    return main;
  }

  // Run  visual
  main.run = function () {
    d3.selectAll(attrs.container).call(main);
    return main;
  }

  return main;
}
