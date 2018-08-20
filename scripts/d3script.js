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

      let zoom = d3.zoom()
          .scaleExtent([0.1, 10])
          .on("zoom", zoomed)

      var simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.node; }).distance(d => {
            if (d.source.group != d.target.group) {
              return 350
            }
            return 200
          }).strength(1))
          .force("charge", d3.forceManyBody())
          .force("center", d3.forceCenter(calc.chartWidth / 2, calc.chartHeight / 2))
          .force('collision', d3.forceCollide().radius(attrs.circleRadiusOrganizaion * 2))
          
      simulation
        .nodes(attrs.data.nodes)
        .on("tick", ticked);
  
      simulation.force("link")
        .links(attrs.data.links);

      //Drawing containers
      var container = d3.select(this);

      //Add svg
      var svg = container.patternify({ tag: 'svg', selector: 'svg-chart-container' })
        .attr('width', attrs.svgWidth)
        .attr('height', attrs.svgHeight)
        .attr('font-family', attrs.defaultFont)
        .call(zoom)

      //Add container g element
      var chart = svg.patternify({ tag: 'g', selector: 'chart' })
        .attr('transform', 'translate(' + (calc.chartLeftMargin) + ',' + calc.chartTopMargin + ')')
        
        
      var linksGroup = chart.patternify({ tag: 'g', selector: 'links' })
      var nodesGroup = chart.patternify({ tag: 'g', selector: 'nodes' })

      var link = linksGroup.patternify({ tag: 'line', selector: 'link', data: attrs.data.links })
          .attr("stroke-width", 1)
          .attr("stroke", 'black')
          .attr("stroke-dasharray", d => d.type == 'dotted' ? 2 : 0);
      
      var node = nodesGroup.patternify({ tag: 'g', selector: 'node', data: attrs.data.nodes })
                    .call(d3.drag()
                          .on("start", dragstarted)
                          .on("drag", dragged)
                          .on("end", dragended));

      node.patternify({ tag: 'circle', selector: 'node-circle', data: d => [d] })
          .attr("r", d => d.type == "people" ? attrs.circleRadiusPeople : attrs.circleRadiusOrganizaion)
          .attr("stroke-width", 1.5)
          .attr("stroke", 'black')
          .attr('class', d => `node-circle ${d.type}`)
          .on('click', function(d) {
            let that = d3.select(this)
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
          })
          
      node.patternify({ tag: 'text', selector: 'node-text', data: d => [d] })
          .attr('text-anchor', 'middle')
          .attr('dy', d => d.type == "people" ? attrs.circleRadiusPeople + 30 : attrs.circleRadiusOrganizaion + 30)
          .text(d => d.node)
          
      function ticked() {
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
