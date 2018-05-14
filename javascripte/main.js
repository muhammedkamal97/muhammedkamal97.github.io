
// Instantiate sigma:
s = new sigma({
    
  renderer: {
    container: document.getElementById('graph-container'),
    type: 'canvas'
  },
  settings: {
  	doubleClickEnabled: false,
  	enableEdgeHovering: true,
  	maxEdgeSize: 5,
  	defaultEdgeLabelSize: 15,
  	edgeLabelThreshold: 1,
  	edgeLabelSize: 'fixed'
  }
});
var count = 0;
var dom = document.querySelector('#graph-container canvas:last-child');
var position = 2;
var edges = 0;
$('#addNode').click(function(){
	s.graph.addNode({
		id: ''+count,
		label: 'n'+count,
		x: position+.5*count,
		y: 400,
		size: 10,
		color: '#666'
	});
	count++;
	s.refresh();
});

var selected = false;
var sourceNode;
s.bind("clickNode", function(e){
	if(document.getElementById('gain').value == ""){
		selected = false;
		return;
	}
	var val = document.getElementById('gain').value;
	if(isNaN(+val)){
		selected = false;
		return;
	}
	var gain = +val;
	if(selected){
		var diff = e.data.node.id-sourceNode
		var edgeType = 'curvedArrow';
		if(diff===1 || diff===-1){ edgeType='arrow'}
		s.graph.edges().forEach( function(element) {
			if(sourceNode===element['source']&&e.data.node.id===element['target']){
				edgeType = 'curvedArrow';
			}
			if(sourceNode===element['target']&&e.data.node.id===element['source']){
				edgeType = 'curvedArrow';
			}
			if(sourceNode===e.data.node.id){
				edgeType = 'curvedArrow';	
			}
		});
		s.graph.addEdge({
			id: 'e'+edges,
			source: sourceNode,
			label: ''+gain,
			target: e.data.node.id,
			size: 10,
			color: '#ccc',
    		hover_color: '#000',
    		type: edgeType
		});
		edges++;
		s.refresh();
	}else{
		sourceNode = e.data.node.id;
	}
	selected = !selected;
});


//data structure represent the graph
var edgeList = [];
var nodeList = [];
var paths = [];
var loops = [];

var nonTouched = [];


var cycleGain = []
var pathGain = []

var delta = [];
var mainDelta = 1;

$('#calculate').click(function(){
	
	//empty data structure
	edgeList = [];
	nodeList = [];
	paths = [];
	loops = [];
	nonTouched = [];
	cycleGain = [];
	pathGain = [];
	delta = [];
	mainDelta = 1;	
	
	// take inpute from the graph

	s.graph.edges().forEach(function(element){
		edgeList.push({source: parseInt(element['source']),
	                target: parseInt(element['target']),
	                gain: parseInt(element['label'])});
	});
	
	s.graph.nodes().forEach( function(element) {
		nodeList.push([]);
	});
	edgeList.forEach( function(element) {
		nodeList[parseInt(element['source'])].push({target: parseInt(element['target']),
													gain: parseInt(element['gain'])});
	});
	
	// function to calculate all the paths
	var path = function(start,end,visit,paths,stack){
		visit[start] = true;
		stack.push(start);
		if(start == end){
			p = stack.slice(0,stack.length);
			paths.push(p);
			visit[start] = false;
			stack.pop();
			return;
		}
		edgeList.forEach( function(e) {
			if(e['source'] == start && !visit[e['target']]){
				path(e['target'],end,visit,paths,stack);
			}
		});
		visit[start] = false;
		stack.pop();
	};


	// calcuate the loops
	function getLoops(){
		var visit = []
		for(var i = 0; i < s.graph.nodes().length;i++){ 
			dfs(i,visit,[i],i);
			visit[i] = true;
		} 

		function dfs(node,visit,stack,final){
			visit[node] = true;
			
			for(var i = 0; i < nodeList[node].length;i++){
				var to = nodeList[node][i]['target'];
				if(!visit[to]){
					stack.push(to);
					dfs(to,visit,stack,final);
					stack.pop();
				} else if (to == final) {
					stack.push(nodeList[node][i]['target']);
					
					l = stack.slice(0, stack.length);
					loops.push(l);
					stack.pop();
					
				}
			}
			visit[node] = false;
		}
	}

	// checking condition for touching loops
	function istouch(loop1,loop2){
			
		for(var i = 0; i < loop1.length; i++){
			for(var j = 0; j < loop2.length; j++){
				if(loop1[i] == loop2[j]){
					return true;
				}
			}
		}
		return false;
	}



	// calculate the combinations of the non touched loops
	function getNonTouchedLoops(){
		for(var i = 1; i <= loops.length;i++ ){
			combination([],0,loops.length-1,0,i);
		}
		
		
		function group(stackOfLoops){
			for(var i = 0; i < stackOfLoops.length;i++)
				for(var j = i+1;j<stackOfLoops.length;j++)
					if(istouch(loops[stackOfLoops[i]],loops[stackOfLoops[j]]))
						return false;
			return true;
		}

		function combination(stack,start,end,loopIndex,combinations_size){
			if(loopIndex == combinations_size){
				print = {}
				l = {}
				
				if(group(stack)){
					arr = []
					for(var i = 0;i < stack.length; i++){
						print[stack[i]] = loops[stack[i]];
						arr.push(loops[stack[i]]);
					}
					l[stack.length] = arr;
					nonTouched.push(l);
					
				}
				return;
			}
			for(var i = start;i <= end && end - i + 1 >= combinations_size - loopIndex;i++){
				stack.push(i);
				combination(stack,i+1,end,loopIndex+1,combinations_size);
				stack.pop();
			}
		}

	}

	// calculate the gains of every path & loop

	function createGain(){
		path();
		cycle();
		mainDelta = Delta(0);
		for (var i = 0; i < paths.length; i++) {
			delta[i] = Delta(i+1);
		}

		function path(){
			var gain = 0;
			for(var i = 0;i < paths.length;i++){
				gain = getGain(paths[i]);
				pathGain.push(gain);
			}
		}

		function cycle(){
			for(var i = 0;i < loops.length;i++){
				var gain = getGain(loops[i]);
				cycleGain.push(gain);
			}	
		}
		function Delta(index){
			var ret = 0;
			for(var i = 0;i < nonTouched.length;i++){
				var keys = Object.keys(nonTouched[i]);
				var num = parseInt(keys[0]);
				var temp = 0;
				
				if(index == 0 || !touching(nonTouched[i][num],paths[index - 1])){
					temp = 1;
					for(var j = 0;j < nonTouched[i][num].length;j++){
						temp *= getGain(nonTouched[i][num][j]);
					}
				}
				
				ret += Math.pow(-1, num)* temp;
			}
			return ret+1;
		}

		function touching(listOfLoops,path){
			
			for(var i = 0;i<listOfLoops.length;i++){
				if(istouch(path,listOfLoops[i])){
					return true;
				}
			}
			return false;
		}

		function getGain(path){
			var gain = 1;
			for(var i = 0;i<path.length-1;i++){
				for(var j = 0; j < edgeList.length;j++){
					if(edgeList[j]['source'] == path[i] && edgeList[j]['target'] == path[i+1]){
						gain *= edgeList[j]['gain'];
						break;
					}
				}
			}
			return gain;
		}

	}

	function Mathon(){
		output = 0.0;
		for(var i = 0; i < paths.length;i++){
			output += (pathGain[i] * delta[i]*1.0)/mainDelta;
		}
		return output;
	}

	
	//printing output
	function fillOutput(){
		$('#output').empty();
		var forwordPaths = "forwordPaths : ";
		for(var i = 0;i < paths.length;i++){
			for(var j = 0;j < paths[i].length;j++){
				forwordPaths +="n"+paths[i][j];
				if(j != paths[i].length - 1)
					forwordPaths += '->';
			}
			forwordPaths += " gain :"+pathGain[i];
			if(i != paths.length - 1)
				forwordPaths += ', ';
		}

		$('#output').append("<label>"+forwordPaths+"</label>");
		$('#output').append("<br>");
		var c = "cycles :  ";
		for(var i = 0;i < loops.length;i++){
			for(var j = 0;j < loops[i].length;j++){
				c +="n"+loops[i][j];
				if(j != loops[i].length - 1)
					c += '->';
			}
			c += " gain :"+cycleGain[i];
			if(i != loops.length - 1)
				c += ', ';
		}
		$('#output').append('<label>'+c+'</label>');
		$('#output').append("<br>");
		c = "<label>delta : ";
		c += mainDelta+"</label><br>";
		$('#output').append(c);
		c = "";
		for(var i = 0; i < delta.length;i++){
			c += "Delta"+(i+1)+" = "+delta[i];
			if(i != delta.length-1)
				c+=", ";
		}
		$('#output').append(c+'</label>'+'<br>');
		c = "OverAll system transfer function = "+Mathon();
		$('#output').append('<label>'+c+'</label>');
	}

	// run the program

	path(0,count-1,[],paths,[]);
	getLoops();
	
	getNonTouchedLoops();
	createGain();
	fillOutput();
	
	console.log(paths);
	console.log(loops);
	
});


$("#clear").click(function(){
	s.graph.clear();
	s.refresh();
	count = 0;
	edges = 0;
});

var del = false;


s.bind('doubleClickEdge', function(e){
	s.graph.dropEdge(e.data.edge.id);
	s.refresh();
});
