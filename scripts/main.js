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
    var people = nodes.filter(d => d.type !== 'organization');
    var organizations = nodes.filter(d => d.type === 'organization');

    var areas = d3.nest().key(d => d.area).entries(people);
    var charts = [];
    var activeChart;

    areas.forEach(area => {
        var container = d3.select('div[data-area="' + area.key + '"]').node();

        var chart = renderChart()
            .svgHeight(window.innerHeight)
            .svgWidth(window.innerWidth)
            .container(container)
            .openNav(openNav)
            .closeNav(closeNav)
            .data({
                nodes: area.values.concat(organizations),
                links: links.filter(x => {
                    return area.values.some(d => d.area === area.key && d.node === x.source)
                })
            })
            .render();
        
        charts.push({
            area: area.key,
            chart: chart
        });
    })

    function selectChart (area) {
        var chartObj = charts.filter(x => x.area === area)[0];
        activeChart = chartObj ? chartObj.chart : null;
    }

    d3.select('#viewToggler')
        .on('click', function () {
            let self = d3.select(this);
            if (self.attr('data-mode') === 'first') {
                self.attr('data-mode', 'second')
            } else {
                self.attr('data-mode', 'first')
            }
            if (activeChart) {
                activeChart.toggle(self.attr('data-mode'))
            }
        })

    d3.selectAll('.area-link')
        .on('click', function () {
            var that = d3.select(this);
            var navItems = d3.selectAll('.area-link');
            
            navItems.classed('active', false).classed('show', false);
            that.classed('show', true);
            var area = that.attr('data-area');

            d3.select('#viewToggler').attr('data-mode', 'first')
            selectChart(area);
        })

    selectChart("Gouvernement")
})