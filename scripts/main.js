function openNav(d) {
    document.getElementById('node').innerHTML = d.node
    if (d.type == "people") {
        ['position',
         'group',
         'education',
         'reference',
         'political_party'].forEach(x => {
            let el = document.getElementById(x)
            if (d[x.replace('_', ' ')].length == 0) {
                el.parentElement.style.display = 'none'
            } else {
                el.innerHTML = d[x.replace('_', ' ')]
                el.parentElement.style.display = 'block'
            }
         })

         d3.selectAll('.org').style('display', 'none')
    }
    else {
        let el = document.getElementById('referenceOrg')
        if (d.reference.length == 0) {
            el.parentElement.style.display = 'none'
        } else {
            el.parentElement.style.display = 'block'
            el.innerHTML = d.reference
        }

        d3.selectAll('.people').style('display', 'none')
    }
    document.getElementById("sidenav").style.width = "450px";
}

function closeNav() {
    document.getElementById("sidenav").style.width = "0";
}

d3.queue()
.defer(d3.csv, "./data/nodes_2.csv")
.defer(d3.csv, "./data/connections.csv")
.await(function (error, nodes, links) {
    var chart = renderChart()
        .svgHeight(window.innerHeight - 47.5)
        .svgWidth(document.getElementById('myGraph').getBoundingClientRect().width)
        .container('#myGraph')
        .openNav(openNav)
        .closeNav(closeNav)
        .data({
            nodes: nodes,
            links: links
        })
        .render();
    d3.select('#viewToggler')
        .on('click', function () {
            let self = d3.select(this);
            if (self.attr('data-mode') === 'first') {
                self.attr('data-mode', 'second')
            } else {
                self.attr('data-mode', 'first')
            }
            chart.toggle(self.attr('data-mode'))
        })

    d3.selectAll('.area-link')
        .on('click', function () {
            var that = d3.select(this);
            var area = that.attr('data-area');
            var navItems = d3.selectAll('.area-select');
            
            navItems.classed('active', false);
            d3.select(this.parentElement).classed('active', true);
            chart.zoomToArea(area);
        })

    var area = d3.select('.top-buttons')
        .select('li.active')
        .select('.area-link')
        .attr('data-area');
        
    chart.zoomToArea(area);
})