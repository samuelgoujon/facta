## sample invokation
```javascript
     var chart = renderChart()
                .svgHeight(window.innerHeight-30)
                .svgWidth(window.innerWidth-30)
                .container('#myGraph')
                .data('Pass Something Here and use it as attrs.data')
                .debug(true)
                .run()
    
    
    
    // OPTIONAL _ update chart
    chart.data(newData)
```
