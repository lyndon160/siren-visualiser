function selectableForceDirectedGraph(location) {

    var div_id= location+"-vis";

  //  console.log(document.getElementById(div_id).offsetHeight)
    var width =document.getElementById(div_id).offsetWidth,//get width of div...
        height =document.getElementById(div_id).offsetHeight,
        shiftKey, ctrlKey;

    var nodeGraph = null;
    var xScale = d3.scale.linear()
        .domain([0,width]).range([0,width]);
    var yScale = d3.scale.linear()
        .domain([0,height]).range([0, height]);


    console.log("#"+location+"-vis");
    var svg = d3.select("#"+location+"-vis")
        .attr("tabindex", 1)
        .on("keydown.brush", keydown)
        .on("keyup.brush", keyup)
        .each(function() { this.focus(); })
        .append("svg")
        .attr("style", "outline: thin dashed #9E9E9E;")
        .attr("width", width)
        .attr("height", height);

    /*var zoomer = d3.behavior.zoom().
    scaleExtent([0.1,10]).
    x(xScale).
    y(yScale).
    on("zoomstart", zoomstart).
    on("zoom", redraw);
*/
    function zoomstart() {
        node.each(function(d) {
            d.selected = false;
            d.previouslySelected = false;
        });
        node.classed("selected", false);
    }

    function redraw() {
        vis.attr("transform",
            "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    var brusher = d3.svg.brush()
    //.x(d3.scale.identity().domain([0, width]))
    //.y(d3.scale.identity().domain([0, height]))
        .x(xScale)
        .y(yScale)
        .on("brushstart", function(d) {
            node.each(function(d) {
                d.previouslySelected = shiftKey && d.selected; });
        })
        .on("brush", function() {
            var extent = d3.event.target.extent();

            node.classed("selected", function(d) {
                return d.selected = d.previouslySelected ^
                    (extent[0][0] <= d.x && d.x < extent[1][0]
                    && extent[0][1] <= d.y && d.y < extent[1][1]);
            });
        })
        .on("brushend", function() {
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
        });

    var svg_graph = svg.append('svg:g')
        .call(zoomer)
    //.call(brusher)

    var rect = svg_graph.append('svg:rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        //.attr('opacity', 0.5)
        .attr('stroke', 'transparent')
        .attr('stroke-width', 1)
        //.attr("pointer-events", "all")
        .attr("id", "zrect")

    var brush = svg_graph.append("g")
        .datum(function() { return {selected: false, previouslySelected: false}; })
        .attr("class", "brush");

    var vis = svg_graph.append("svg:g");

    vis.attr('fill', 'red')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)
        .attr('id', 'vis')


    brush.call(brusher)
        .on("mousedown.brush", null)
        .on("touchstart.brush", null)
        .on("touchmove.brush", null)
        .on("touchend.brush", null);

    brush.select('.background').style('cursor', 'auto');

    var link = vis.append("g")
        .attr("class", "link")
        .selectAll("line");

    var node = vis.append("g")
        .attr("class", "node")
        .selectAll("circle");

    center_view = function() {
        // Center the view on the molecule(s) and scale it so that everything
        // fits in the window

        if (nodeGraph === null)
            return;

        var nodes = nodeGraph.nodes;

        //no molecules, nothing to do
        if (nodes.length === 0)
            return;

        // Get the bounding box
        min_x = d3.min(nodes.map(function(d) {return d.x;}));
        min_y = d3.min(nodes.map(function(d) {return d.y;}));

        max_x = d3.max(nodes.map(function(d) {return d.x;}));
        max_y = d3.max(nodes.map(function(d) {return d.y;}));


        // The width and the height of the graph
        mol_width = max_x - min_x;
        mol_height = max_y - min_y;

        // how much larger the drawing area is than the width and the height
        width_ratio = width / mol_width;
        height_ratio = height / mol_height;

        // we need to fit it in both directions, so we scale according to
        // the direction in which we need to shrink the most
        min_ratio = Math.min(width_ratio, height_ratio) * 0.8;

        // the new dimensions of the molecule
        new_mol_width = mol_width * min_ratio;
        new_mol_height = mol_height * min_ratio;

        // translate so that it's in the center of the window
        x_trans = -(min_x) * min_ratio + (width - new_mol_width) / 2;
        y_trans = -(min_y) * min_ratio + (height - new_mol_height) / 2;


        // do the actual moving
        vis.attr("transform",
            "translate(" + [x_trans, y_trans] + ")" + " scale(" + min_ratio + ")");

        // tell the zoomer what we did so that next we zoom, it uses the
        // transformation we entered here
        zoomer.translate([x_trans, y_trans ]);
        zoomer.scale(min_ratio);

    };

    function dragended(d) {
        //d3.select(self).classed("dragging", false);
        node.filter(function(d) { return d.selected; })
            .each(function(d) { d.fixed &= ~6; })

    }

    d3.json("graphFile.json", function(error, graph) {
        nodeGraph = graph;

        graph.links.forEach(function(d) {
            d.source = graph.nodes[d.source];
            d.target = graph.nodes[d.target];
        });

        link = link.data(graph.links).enter().append("line")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });


        var force = d3.layout.force()
            .charge(-120)
            .linkDistance(30)
            .nodes(graph.nodes)
            .links(graph.links)
            .size([width, height])
            .start();

        function dragstarted(d) {
            d3.event.sourceEvent.stopPropagation();
            if (!d.selected && !shiftKey) {
                // if this node isn't selected, then we have to unselect every other node
                node.classed("selected", function(p) { return p.selected =  p.previouslySelected = false; });
            }

            d3.select(this).classed("selected", function(p) { d.previouslySelected = d.selected; return d.selected = true; });

            node.filter(function(d) { return d.selected; })
                .each(function(d) { d.fixed |= 2; })
        }

        function dragged(d) {
            node.filter(function(d) { return d.selected; })
                .each(function(d) {
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;

                    d.px += d3.event.dx;
                    d.py += d3.event.dy;
                })

            force.resume();
        }
        node = node.data(graph.nodes).enter().append("circle")
            .attr("r", 4)
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .on("dblclick", function(d) { d3.event.stopPropagation(); })
            .on("click", function(d) {
                if (d3.event.defaultPrevented) return;

                if (!shiftKey) {
                    //if the shift key isn't down, unselect everything
                    node.classed("selected", function(p) { return p.selected =  p.previouslySelected = false; })
                }

                // always select this node
                d3.select(this).classed("selected", d.selected = !d.previouslySelected);
            })

            .on("mouseup", function(d) {
                //if (d.selected && shiftKey) d3.select(this).classed("selected", d.selected = false);
            })
            .call(d3.behavior.drag()
                .on("dragstart", dragstarted)
                .on("drag", dragged)
                .on("dragend", dragended));

        function tick() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr('cx', function(d) { return d.x; })
                .attr('cy', function(d) { return d.y; });

        };

        force.on("tick", tick);

    });


    function keydown() {
        shiftKey = d3.event.shiftKey || d3.event.metaKey;
        ctrlKey = d3.event.ctrlKey;

        console.log('d3.event', d3.event)

        if (d3.event.keyCode == 67) {   //the 'c' key
            center_view();
        }

        if (shiftKey) {
            svg_graph.call(zoomer)
                .on("mousedown.zoom", null)
                .on("touchstart.zoom", null)
                .on("touchmove.zoom", null)
                .on("touchend.zoom", null);

            //svg_graph.on('zoom', null);
            vis.selectAll('g.gnode')
                .on('mousedown.drag', null);

            brush.select('.background').style('cursor', 'crosshair')
            brush.call(brusher);
        }
    }

    function keyup() {
        shiftKey = d3.event.shiftKey || d3.event.metaKey;
        ctrlKey = d3.event.ctrlKey;

        brush.call(brusher)
            .on("mousedown.brush", null)
            .on("touchstart.brush", null)
            .on("touchmove.brush", null)
            .on("touchend.brush", null);

        brush.select('.background').style('cursor', 'auto')
        svg_graph.call(zoomer);
    }
}

function pie(location, reserved_ram, total_ram) {
    var dom_location = location + "-stat";
    console.log(dom_location);

    var free_ram = total_ram-reserved_ram;

    if(reserved_ram == null)
        reserved_ram=200;
    if(total_ram == null)
        total_ram=1024;


    var pie = new d3pie(dom_location, {
        "header": {
            "title": {
                "text": "RAM",
                "fontSize": 14
            },
            "subtitle": {
                "text": reserved_ram.toString() + "MB/" + total_ram.toString() + "MB",
                "color": "#999999",
                "fontSize": 10
            },
            "location": "pie-center",
            "titleSubtitlePadding": 9
        },
        "footer": {
            "color": "#999999",
            "fontSize": 10,
            "location": "bottom-left"
        },
        "size": {
            "canvasHeight": 150,
            "canvasWidth": 150,
            "pieInnerRadius": "78%",
            "pieOuterRadius": "82%"
        },
        "data": {
            "sortOrder": "value-desc",
            "content": [
                {
                    "label": "Used",
                    "value": reserved_ram,
                    "color": "#e65454"
                },
                {
                    "label": "Free",
                    "value": free_ram,
                    "color": "#a1a1a1"
                }
            ]
        },
        "labels": {
            "outer": {
                "format": "none",
                "pieDistance": 32
            },
            "inner": {
                "format": "none",
                "hideWhenLessThanPercentage": 3
            },
            "mainLabel": {
                "fontSize": 11
            },
            "percentage": {
                "color": "#ffffff",
                "decimalPlaces": 0
            },
            "value": {
                "color": "#adadad",
                "fontSize": 11
            },
            "lines": {
                "enabled": true
            },
            "truncation": {
                "enabled": true
            }
        },
        "effects": {
            "pullOutSegmentOnClick": {
                "effect": "linear",
                "speed": 400,
                "size": 8
            }
        }
    });
}
var nodes_response;
//This should update pie charts and d3 graphs accordingly
function getNodes(){
    //nodes_response;
    /*$.getJSON("http://127.0.0.1:60000/nodes", function(json) {
        console.log( "Response", json );
    })*/


    //Can all diagrams be cleared here?

    console.log( "Getting nodes from file");
    //nodes_response = $.getJSON("demo2.json", function(json) {
    nodes_response = $.getJSON("http://127.0.0.1:60000/nodes/containers", function(json) {
        $("#svg").remove();
        $(".fog-stat").empty();
        d3v4.selectAll("svg > *").remove();
        console.log( "Response", json);
        nodeGraph("residence", json);
        nodeGraph("exchange", json);
        nodeGraph("datacenter", json);

        //calculate total ram for residence, exchange, datacenter
        var i;
        var residence_total_memory = 0;
        var residence_reserved_memory = 0;

        var exchange_total_memory = 0;
        var exchange_reserved_memory = 0;

        var datacenter_total_memory = 0;
        var datacenter_reserved_memory = 0;

        for(i=0; i< json.length; i++){
            console.log("In the "+json[i].location);
            if(json[i].location == "residence") {
                residence_reserved_memory += json[i].reserved_memory;
                residence_total_memory += json[i].total_memory;
            }
            else if(json[i].location == "exchange") {
                exchange_reserved_memory += json[i].reserved_memory;
                exchange_total_memory += json[i].total_memory;
            }
            else{
                datacenter_reserved_memory += json[i].reserved_memory;
                datacenter_total_memory += json[i].total_memory;
            }
        }


        //Update pie charts in similar fashion
        console.log(residence_reserved_memory);
        console.log(residence_total_memory);
        pie("residence",residence_reserved_memory ,residence_total_memory);
        pie("exchange",exchange_reserved_memory, exchange_total_memory);
        pie("datacenter",datacenter_reserved_memory, datacenter_total_memory);
    });

   //setInterval(getNodes, 5000);

}


//Updates auctions for the three areas
function liveAuctions(){
    //Get data from localhost:8080/auction/live
    auctions = $.getJSON("http://127.0.0.1:8080/auction/live", function(json) {

        console.log("Auction data");
        console.log(json[0].items);
        //Dynamically fill contents of table
        $('#datacenter-auction').empty();
        $('#exchange-auction').empty();
        $('#residence-auction').empty();

        var table_start = '<table class="table table-hover"><thead><tr><th>Items</th><th>Winning bidder</th><th>Amount</th></tr></thead><tbody>';
        var table_end = '</tbody></table>';
        var datacenter_table = table_start;
        var exchange_table = table_start;
        var residence_table = table_start;



        var i;
        for(i=0; i < json[0].items.length; i++){
            if(json[0].items[i].parent_node.location == "datacenter") {
                datacenter_table += '<tr>';

                var item = json[0].items[i].memory;

                datacenter_table += '<td>' + item + 'MB</td>';

                var leading_bidder = json[0].items[i].leading_bid.user_id;

                datacenter_table += '<td>' + leading_bidder + '</td>';

                var highest_bid = json[0].items[i].price;

                datacenter_table += '<td>' + highest_bid + '</td>';

                datacenter_table += '</tr>';
            }
            else if(json[0].items[i].parent_node.location == "exchange") {
                exchange_table += '<tr>';

                var item = json[0].items[i].memory;

                exchange_table += '<td>' + item + 'MB</td>';

                var leading_bidder = json[0].items[i].leading_bid.user_id;

                exchange_table += '<td>' + leading_bidder + '</td>';

                var highest_bid = json[0].items[i].price;

                exchange_table += '<td>' + highest_bid + '</td>';

                exchange_table += '</tr>';



            }

            else if(json[0].items[i].parent_node.location == "residence") {
                residence_table += '<tr>';

                var item = json[0].items[i].memory;

                residence_table += '<td>' + item + 'MB</td>';

                var leading_bidder = json[0].items[i].leading_bid.user_id;

                residence_table += '<td>' + leading_bidder + '</td>';

                var highest_bid = json[0].items[i].price;

                residence_table += '<td>' + highest_bid + '</td>';

                residence_table += '</tr>';
            }
        }

        datacenter_table += table_end;



        //datacenter-auction

        $('#datacenter-auction').append(datacenter_table);

        //exchange-auction

        $('#exchange-auction').append(exchange_table);

        //residence-auction

        $('#residence-auction').append(residence_table);


        //Call function again in 10 seconds or so







    });



}

function nodeGraph(location, nodes_info){

    console.log("Creating node graphs");
    var div_id= location+"-vis";
    console.log("#"+location+"-vis");
    //  console.log(document.getElementById(div_id).offsetHeight)
    var element =document.getElementById(div_id);
    $(div_id).empty();

    //This should be continously updated
    var width =document.getElementById(div_id).offsetWidth,//get width of div...
        height =document.getElementById(div_id).offsetHeight,
        shiftKey, ctrlKey;

  //  var nodeGraph = null;
   // var xScale = d3.scale.linear()
    //    .domain([0,width]).range([0,width]);
   // var yScale = d3.scale.linear()
   //     .domain([0,height]).range([0, height]);


    console.log("#"+location+"-vis");
    var svg = d3v4.select("#"+location+"-vis")
        .attr("tabindex", 1)

//        .on("keydown.brush", keydown)
 //       .on("keyup.brush", keyup)
//        .each(function() { this.focus(); })
        .append("svg")
        .attr("id", "svg")
        .attr("style", "outline: thin dashed #9E9E9E;")
        .classed("svg-container", true) //container class to make it responsive
        //responsive SVG needs these 2 attributes and no width and height attr
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 300 200")
        //class to make it responsive
        .classed("svg-content-responsive", true);
//.attr("width", width)
  //      .attr("height", height);


  //  // Define 'div' for tooltips
  //  var div = d3v4.select("body")
//.append("div")  // declare the tooltip div
 //       .attr("class", "tooltip")              // apply the 'tooltip' class
   //     .style("opacity", 0);                  // set the opacity to nil



    var color = d3v4.scaleOrdinal(d3v4.schemeCategory20);

    var simulation = d3v4.forceSimulation()
        .force("link", d3v4.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3v4.forceManyBody().strength(-10))
        .force("center", d3v4.forceCenter(width / 2, height / 2));


    //Test.json needs to be based demo.json (probably need to craft a new file....
    //This needs to be built first
    //Build json for devices and containers

    //var nodes_response = getNodes();

    //Iterate over device IDs
    var graph;
    var node_list = [];
    var link_list = [];
   // console.log(nodes_response[1]);
    console.log("Nodes info");
    console.log(nodes_info);
    if(nodes_info) {
        var i;

        for (i = 0; i < nodes_info.length; i++) {
            console.log(nodes_info[i]);
            console.log(nodes_info[i].id);
            console.log(nodes_info[i].location);
            console.log(nodes_info[i].reserved_memory);
            console.log(nodes_info[i].arch);
            console.log(nodes_info[i].containers);

            console.log("Found a node");

            var size = nodes_info[i].total_memory/100;
            if(nodes_info[i].location == location){
                console.log("Creating node");
                node_list.push({"id": nodes_info[i].id, "size": size, "ext": nodes_info[i], "icon": "pi.png"});

                //Loop over nodes containers
                var j;
                for(j = 0; j < nodes_info[i].containers.length; j++) {
                    console.log("Creating container node");
                    node_list.push({"id": nodes_info[i].id + String.fromCharCode(97+j), "size": 3, "icon": "pi.png"});
                    link_list.push({"source": nodes_info[i].id, "target": nodes_info[i].id + String.fromCharCode(97+j)});
                }
            }
        }
        graph={"nodes": node_list, "links": link_list};
        console.log(graph);
    }
//    else{
//        d3_json="test.json";
//    }

    //console.log("Nodes", nodes_response.responseJSON);
    //for(var node in nodes_info){
     //   console.log(node);
    ///}

    //Create a large node for each device.



    //Determine if device ID has any container, if so create new small node and link it


    //Change this to work from read from object
   // d3v4.json(d3_json, function(error, graph) {
   //     if (error) throw error;

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", function(d) { return Math.sqrt(d.value); });



    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("xlink:href", function(d) { return d.icon; })
        .attr("r", function(d) { return d.size; })
        .attr("fill", function(d) { return color(d.group); })
        .call(d3v4.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));




    node.on("click", function(d) {
        var g = d3v4.select(this); // The context
        // The class is used to remove the additional text later
        var info = g.append('text')
            .classed('info', true)
            .attr('x', 20)
            .attr('y', 10)
         //   .attr('data-toggle', 'popover')
            .text('More info');
        console.log(g);
        console.log(d);
     //   var currentx = d3v4.transform(g.attr("transform")).translate[0];
      //  var currenty = d3v4.transform(g.attr("transform")).translate[1];


        console.log(d.ext.location);
        console.log(d.ext.reserved_memory);
        console.log(d.ext.total_memory);

        var hoz_table_start = '<table class="table table-hover"> <tbody>';
        var hoz_table_end = '</tbody></table>';
        var hoz_content = hoz_table_start;

        //Fill out device info
        $("#device-info").empty();

        //Address
        hoz_content += '<tr><th>Address</th><td>'+d.ext.id+'</td></tr>';
        //Location
        hoz_content += '<tr><th>Location</th><td>'+d.ext.location+'</td></tr>';
        //Architecture
        hoz_content += '<tr><th>Architecture</th><td>'+d.ext.arch+'</td></tr>';

        hoz_content += '<tr><th>Running services</th><td>'+d.ext.containers.length+'</td></tr>';

        $("#device-info").append(hoz_content);



        //$("#modalContent").text(JSON.stringify(d));
        //console.log(d)
       // $("#modalContent").text(JSON.stringify(d.ext.id)+JSON.stringify(d.ext.));
        var i;
        var containers = [];
        var text = "<ul>";
        var container_table_start =  '<table class="table hover-mode"><thead><tr><th>Service name</th><th>Service URI</th><th>Status</th></tr></thead><tbody>';
        var container_table_end = '</tbody></table>';
        var container_table_content = container_table_start;
        var container_table_service_name = '';
        var container_table_service_uri = '';
        var container_table_service_status = '';
        for(i=0;i < d.ext.containers.length; i++){
            containers.push(d.ext.containers[i].Ports[0].PublicPort);
            var service_url = "http://" + d.ext.id +":"+d.ext.containers[i].Ports[0].PublicPort;
            var service_name = d.ext.containers[i].Image;
            container_table_service_name = '<td>' + service_name.replace("lyndon160/","") + '</td>';

            container_table_service_uri = '<td>' + "<a href=" + service_url + ">" + service_url + "</a>" + '</td>';
            container_table_service_status = '<td>' + d.ext.containers[i].Status + '</td>';

            container_table_content += '<tr>' + container_table_service_name + container_table_service_uri + container_table_service_status + '</tr>';

            text += "<li>" + service_name.replace("lyndon160/","") + ": <a href=" + service_url + ">" + service_url + "</a></li>";
        }

        text += "</ul>";


        //container_table_content +='<tr>' + container_table_service_name + '<tr>' + '<tr>' + container_table_service_uri + '<tr>' + '<tr>' + container_table_service_status + '<tr>';

        $("#device-services").empty();
        $("#device-services").append(container_table_content);


        $("#myModal").modal();
        $("#modal-stat").text("");
        pie("modal", d.ext.reserved_memory, d.ext.total_memory);
        //Populate modal with.... variable


        //Try pop over too
    //    $('[data-toggle="popover"]').popover();


    //    div.html(
     //       'Hello world' + // The first <a> tag

      //      "<br/>")
    //       .style("left", element.getBoundingClientRect().left+d3v4.mouse(this)[0] - 5 + "px") //this is wrong
     //       .style("top", element.getBoundingClientRect().top+(d3v4.mouse(this)[1] - 5) + "px")
     //       .style("opacity", 1);
      //  console.log(currentx);
        console.log(d3v4.mouse(this));
        });

        node.append("title")
            .text(function(d) { return d.id; });

        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);

        function ticked() {
            link
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            /*node
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });*/


            node.attr("cx", function(d) { return d.x = Math.max(5, Math.min(width - 5, d.x)); })
                .attr("cy", function(d) { return d.y = Math.max(5, Math.min(height - 5, d.y)); });
        }




    function dragstarted(d) {
        if (!d3v4.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3v4.event.x;
        d.fy = d3v4.event.y;
    }

    function dragended(d) {
        if (!d3v4.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }


}

