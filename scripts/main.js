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

Promise.all([d3.csv("./data/nodes.csv"), d3.csv("./data/connections.csv")])
       .then(data => {
            var chart = renderChart()
                .svgHeight(window.innerHeight)
                .svgWidth(document.getElementById('myGraph').getBoundingClientRect().width)
                .container('#myGraph')
                .openNav(openNav)
                .closeNav(closeNav)
                .mode('first')
                .data({
                    nodes: data[0],
                    links: data[1]
                })
                .run();
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
       })
     