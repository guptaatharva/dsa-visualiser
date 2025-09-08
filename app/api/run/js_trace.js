const { Interpreter } = require('js-interpreter');
const readline = require('readline');

function traceJS(code) {
  let steps = [];
  let output = '';
  const interpreter = new Interpreter(code, function(interpreter, globalObject) {
    interpreter.setProperty(globalObject, 'console', interpreter.nativeToPseudo({
      log: function(...args) {
        output += args.join(' ') + '\n';
      }
    }));
  });
  function isLinkedList(obj) {
    return obj && typeof obj === 'object' && 'value' in obj && 'next' in obj;
  }
  function extractLinkedList(node) {
    let nodes = [];
    let seen = new Set();
    while (node && typeof node === 'object' && !seen.has(node)) {
      seen.add(node);
      nodes.push({
        id: node,
        value: node.value,
        next: node.next || null
      });
      node = node.next;
    }
    return nodes.length > 1 ? nodes : null;
  }
  function stepper() {
    let ok = interpreter.step();
    let scope = interpreter.getScope();
    let vars = {};
    for (let name in scope.properties) {
      vars[name] = interpreter.pseudoToNative(scope.properties[name]);
    }
    let step = {
      line: interpreter.stateStack[0]?.node.loc?.start?.line || 0,
      variables: vars,
      output,
      stack: interpreter.stateStack.map(s => s.node.type)
    };
    // Linked List detection and pointers
    let pointerMap = {};
    let nodeIds = new Set();
    for (let k in vars) {
      if (isLinkedList(vars[k])) {
        let nodes = extractLinkedList(vars[k]);
        if (nodes) {
          step.visual = { type: 'linked-list', nodes };
          nodeIds = new Set(nodes.map(n => n.id));
          break;
        }
      }
    }
    if (step.visual && step.visual.type === 'linked-list') {
      for (let varName in vars) {
        if (isLinkedList(vars[varName])) {
          let nodeId = vars[varName];
          if (nodeIds.has(nodeId)) {
            pointerMap[nodeId] = pointerMap[nodeId] || [];
            pointerMap[nodeId].push(varName);
          }
        }
      }
      if (Object.keys(pointerMap).length > 0) {
        step.pointers = pointerMap;
      }
    }
    // Array detection and pointers
    let arrayIndices = {};
    for (let k in vars) {
      if (Array.isArray(vars[k]) && vars[k].every(x => typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean' || x === null)) {
        step.visual = { type: 'array', values: vars[k] };
        for (let var2 in vars) {
          if (typeof vars[var2] === 'number' && vars[var2] >= 0 && vars[var2] < vars[k].length) {
            if (["left","right","mid","l","r","m","start","end"].includes(var2.toLowerCase())) {
              arrayIndices[vars[var2]] = arrayIndices[vars[var2]] || [];
              arrayIndices[vars[var2]].push(var2);
            }
          }
        }
        if (Object.keys(arrayIndices).length > 0) {
          step.pointers = arrayIndices;
        }
        break;
      }
    }
    // Stack detection (array used as stack)
    for (let k in vars) {
      if (Array.isArray(vars[k]) && vars[k].length > 0 && k.toLowerCase().includes('stack')) {
        step.visual = { type: 'stack', values: vars[k] };
        step.pointers = { [vars[k].length - 1]: ['top'] };
        break;
      }
    }
    // Queue detection (array used as queue)
    for (let k in vars) {
      if (Array.isArray(vars[k]) && vars[k].length > 0 && k.toLowerCase().includes('queue')) {
        step.visual = { type: 'queue', values: vars[k] };
        step.pointers = { 0: ['front'], [vars[k].length - 1]: ['rear'] };
        break;
      }
    }
    // Heap detection (array used as heap)
    for (let k in vars) {
      if (Array.isArray(vars[k]) && vars[k].length > 0 && k.toLowerCase().includes('heap')) {
        step.visual = { type: 'heap', values: vars[k] };
        break;
      }
    }
    // Graph detection (object as adjacency list)
    for (let k in vars) {
      if (vars[k] && typeof vars[k] === 'object' && !Array.isArray(vars[k]) && k.toLowerCase().includes('graph')) {
        const adj = vars[k];
        const nodeIds = Object.keys(adj);
        const nodes = nodeIds.map((id, idx) => ({ id, label: id, x: 100 + 400 * (idx / Math.max(1, nodeIds.length-1)), y: 180 }));
        const edges = [];
        for (const src in adj) {
          if (Array.isArray(adj[src])) {
            for (const dst of adj[src]) {
              edges.push({ from: src, to: dst });
            }
          }
        }
        step.visual = { type: 'graph', nodes, edges };
        break;
      }
    }
    steps.push(step);
    return ok;
  }
  while (stepper());
  return steps;
}

let code = '';
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => code += line + '\n');
rl.on('close', () => {
  try {
    const trace = traceJS(code);
    console.log(JSON.stringify(trace));
  } catch (e) {
    console.log(JSON.stringify([{ error: e.message }]));
  }
}); 