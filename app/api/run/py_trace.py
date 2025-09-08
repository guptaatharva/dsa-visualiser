import sys
import json
import io
import traceback
import inspect
import copy
import threading
import re
import collections

# Global variable for storing trace steps
steps = []
MAX_STEPS = 1000

# Timeout exception
class TimeoutException(Exception):
    pass

def timeout_handler():
    raise TimeoutException("Execution timed out")

def safe_serialize(obj):
    """Safely serialize an object for JSON output"""
    try:
        if isinstance(obj, (int, float, str, bool, type(None))):
            return obj
        elif isinstance(obj, (list, tuple)):
            return [safe_serialize(item) for item in obj]
        elif isinstance(obj, dict):
            return {str(k): safe_serialize(v) for k, v in obj.items()}
        elif hasattr(obj, '__dict__'):
            # For objects, try to serialize their attributes
            attrs = {}
            for attr in dir(obj):
                if not attr.startswith('__'):
                    try:
                        value = getattr(obj, attr)
                        if not callable(value):
                            attrs[attr] = safe_serialize(value)
                    except:
                        pass
            return attrs
        else:
            return str(obj)
    except:
        return str(obj)

def detect_pointers(local_vars, array_length):
    """Detect pointer variables that index into arrays, grids, etc."""
    pointers = {}
    for var_name, var_value in local_vars.items():
        # Support both 0-based and 1-based indices (for user code that uses 1-based)
        if isinstance(var_value, int):
            # 0-based
            if 0 <= var_value < array_length:
                if var_name.lower() in ['i', 'j', 'k', 'left', 'right', 'mid', 'l', 'r', 'm', 'start', 'end', 'top', 'bottom', 'front', 'back', 'low','high' ]:
                    if var_value not in pointers:
                        pointers[var_value] = []
                    pointers[var_value].append(var_name)
            # 1-based (common in some user code)
            elif 1 <= var_value <= array_length:
                if var_name.lower() in ['i', 'j', 'k', 'left', 'right', 'mid', 'l', 'r', 'm', 'start', 'end', 'top', 'bottom', 'front', 'back', 'low','high']:
                    idx = var_value - 1
                    if idx not in pointers:
                        pointers[idx] = []
                    pointers[idx].append(var_name + ' (1-based)')
    return pointers

def detect_stack_operations(local_vars, step):
    """Detect stack operations and special features"""
    stack_data = {}
    
    # Detect stack arrays - including class attributes and deep scan for .stack in all objects
    stack_arrays = {}
    
    # Direct stack variables
    for k, v in local_vars.items():
        if isinstance(v, list) and (k.lower().find('stack') != -1 or 
                                   any(op in str(local_vars).lower() for op in ['push', 'pop', 'peek'])):
            stack_arrays[k] = v
    
    # Stack variables in class instances (deep scan for .stack attribute)
    for k, v in local_vars.items():
        if hasattr(v, '__dict__') and not isinstance(v, (list, dict, set, tuple)):
            for attr_name in dir(v):
                if not attr_name.startswith('__') and 'stack' in attr_name.lower():
                    try:
                        attr_value = getattr(v, attr_name)
                        if isinstance(attr_value, list):
                            stack_arrays[f"{k}.{attr_name}"] = attr_value
                    except Exception:
                        pass
    
    for stack_name, stack_values in stack_arrays.items():
        stack_info = {
            'values': copy.deepcopy(stack_values),
            'operation': None,
            'operationValue': None,
            'minValues': [],
            'ngeResults': {},
            'rpnStack': []
        }
        
        # Detect current operation from variable names and values
        for var_name, var_value in local_vars.items():
            # Detect push operation
            if var_name.lower() in ['push_val', 'value', 'item', 'element'] and isinstance(var_value, (int, float, str)):
                stack_info['operation'] = 'push'
                stack_info['operationValue'] = var_value
            
            # Detect pop operation
            if var_name.lower() in ['pop_val', 'popped', 'removed'] and isinstance(var_value, (int, float, str)):
                stack_info['operation'] = 'pop'
                stack_info['operationValue'] = var_value
            
            # Detect peek operation
            if var_name.lower() in ['peek_val', 'top_val', 'current'] and isinstance(var_value, (int, float, str)):
                stack_info['operation'] = 'peek'
                stack_info['operationValue'] = var_value
        
        # Detect MinStack functionality
        min_stack_vars = {k: v for k, v in local_vars.items() 
                         if isinstance(v, list) and k.lower().find('min') != -1}
        for min_stack_name, min_stack_values in min_stack_vars.items():
            if min_stack_values:
                stack_info['minValues'] = copy.deepcopy(min_stack_values)
                stack_info['operation'] = 'min'
        
        # Detect NGE (Next Greater Element) results
        nge_vars = {k: v for k, v in local_vars.items() 
                   if isinstance(v, dict) and (k.lower().find('nge') != -1 or k.lower().find('greater') != -1)}
        for nge_name, nge_results in nge_vars.items():
            if isinstance(nge_results, dict):
                stack_info['ngeResults'] = copy.deepcopy(nge_results)
                stack_info['operation'] = 'nge'
        
        # Detect RPN (Reverse Polish Notation) stack
        rpn_vars = {k: v for k, v in local_vars.items() 
                   if isinstance(v, list) and (k.lower().find('rpn') != -1 or k.lower().find('calc') != -1)}
        for rpn_name, rpn_values in rpn_vars.items():
            if rpn_values:
                stack_info['rpnStack'] = copy.deepcopy(rpn_values)
                stack_info['operation'] = 'rpn'
        
        # Add pointers for stack
        pointers = detect_pointers(local_vars, len(stack_values))
        if pointers:
            stack_info['pointers'] = pointers
        
        stack_data[stack_name] = stack_info
    
    return stack_data

def detect_visuals(local_vars, step):
    try:
        visuals = []
        # Get current function name from call stack if available
        current_function = None
        if 'call_stack' in step and step['call_stack']:
            current_function = step['call_stack'][-1]['function']
            if current_function == '<module>' and len(step['call_stack']) > 1:
                current_function = step['call_stack'][-2]['function']

        # Helper: find all lists, with their names and parent objects
        def find_all_lists(obj, prefix='', seen=None, parent_name=None):
            if seen is None:
                seen = set()
            found = []
            # Filter out builtins and system objects
            if parent_name and (parent_name.startswith('__') or parent_name == '__builtins__'):
                return []
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k.startswith('__') or k == '__builtins__':
                        continue
                    found += find_all_lists(v, prefix + k + '.', seen, k)
            elif hasattr(obj, '__dict__') and not isinstance(obj, (list, dict, set, tuple)):
                # Skip builtins
                if getattr(obj, '__module__', None) == 'builtins':
                    return []
                for attr_name in dir(obj):
                    if attr_name.startswith('__') or attr_name == '__builtins__':
                        continue
                    try:
                        attr_val = getattr(obj, attr_name)
                        found += find_all_lists(attr_val, prefix + attr_name + '.', seen, attr_name)
                    except Exception:
                        pass
            elif isinstance(obj, list):
                if id(obj) not in seen:
                    found.append((prefix[:-1], obj))
                    seen.add(id(obj))
            return found

        # Gather all lists with their names
        all_lists = []
        for var_name, var_value in local_vars.items():
            if var_name.startswith('__') or var_name == '__builtins__':
                continue
            all_lists += find_all_lists(var_value, var_name + '.', parent_name=var_name)
        # Also add top-level lists
        for var_name, var_value in local_vars.items():
            if var_name.startswith('__') or var_name == '__builtins__':
                continue
            if isinstance(var_value, list):
                all_lists.append((var_name, var_value))

        # Deduplicate by id, prefer stack names
        id_to_info = {}
        for name, lst in all_lists:
            if not isinstance(lst, list):
                continue
            list_id = id(lst)
            is_stack = (
                'stack' in name.lower() or
                (current_function is not None and current_function.lower() in ['push', 'pop', 'peek'])
            )
            # Prefer stack name if available
            if list_id not in id_to_info:
                id_to_info[list_id] = {'name': name, 'lst': lst, 'is_stack': is_stack}
            else:
                prev = id_to_info[list_id]
                # If this name is more stack-like, prefer it
                if is_stack and not prev['is_stack']:
                    id_to_info[list_id] = {'name': name, 'lst': lst, 'is_stack': is_stack}
                # If both are stack or both are not, prefer top-level name (no dot) over attribute name
                elif is_stack == prev['is_stack']:
                    prev_is_top_level = '.' not in prev['name']
                    curr_is_top_level = '.' not in name
                    if curr_is_top_level and not prev_is_top_level:
                        id_to_info[list_id] = {'name': name, 'lst': lst, 'is_stack': is_stack}
                    elif curr_is_top_level == prev_is_top_level:
                        # If both are top-level or both are attributes, prefer shorter name
                        if len(name) < len(prev['name']):
                            id_to_info[list_id] = {'name': name, 'lst': lst, 'is_stack': is_stack}

        # Only one visual per unique list, with best name and type
        for info in id_to_info.values():
            arr_snapshot = copy.deepcopy(info['lst'])
            if info['is_stack']:
                visual = {'type': 'stack', 'values': arr_snapshot, 'name': info['name']}
            else:
                visual = {'type': 'array', 'values': arr_snapshot, 'name': info['name']}
            pointers = detect_pointers(local_vars, len(arr_snapshot))
            if pointers:
                visual['pointers'] = pointers
            visuals.append(visual)

        # Queue detection (array or deque used as queue)
        for name, lst in all_lists:
            if not (isinstance(lst, list) or isinstance(lst, collections.deque)):
                continue
            if 'queue' in name.lower():
                arr_snapshot = copy.deepcopy(list(lst))
                visual = {'type': 'queue', 'values': arr_snapshot, 'name': name}
                pointers = detect_pointers(local_vars, len(arr_snapshot))
                if pointers:
                    visual['pointers'] = pointers
                visuals.append(visual)

        # Linked List detection (unchanged)
        for var_name, var_value in local_vars.items():
            if hasattr(var_value, 'next') and hasattr(var_value, 'val'):
                nodes = []
                seen = set()
                current = var_value
                node_id = 0
                pointers = {}
                while current and id(current) not in seen:
                    seen.add(id(current))
                    nodes.append({
                        'id': node_id,
                        'value': current.val,
                        'next': node_id + 1 if current.next else None
                    })
                    for k, v in local_vars.items():
                        if v is current:
                            if node_id not in pointers:
                                pointers[node_id] = []
                            pointers[node_id].append(k)
                    current = current.next
                    node_id += 1
                    if node_id > 20:
                        break
                if len(nodes) > 1:
                    visual = {
                        'type': 'linked-list',
                        'nodes': nodes,
                        'name': var_name,
                        'pointers': pointers
                    }
                    visuals.append(visual)

        # General (n-ary) Tree detection (e.g., Trie, SuffixTree)
        for var_name, var_value in local_vars.items():
            # Detect a general tree node by checking for a 'children' dict attribute
            if hasattr(var_value, 'children') and isinstance(getattr(var_value, 'children', None), dict):
                def serialize_general_tree(node, node_id=[0]):
                    if not node:
                        return None
                    this_id = node_id[0]
                    node_id[0] += 1
                    children = []
                    for label, child in getattr(node, 'children', {}).items():
                        child_serialized = serialize_general_tree(child, node_id)
                        if child_serialized:
                            children.append({
                                'label': label,
                                'node': child_serialized
                            })
                    return {
                        'id': this_id,
                        'children': children
                    }
                root_serialized = serialize_general_tree(var_value)
                if root_serialized:
                    visual = {'type': 'general-tree', 'root': root_serialized, 'name': var_name}
                    visuals.append(visual)

        # Binary Tree detection
        for var_name, var_value in local_vars.items():
            # Detect a TreeNode by checking for left, right, and val attributes
            if hasattr(var_value, 'left') and hasattr(var_value, 'right') and hasattr(var_value, 'val'):
                def serialize_tree(node, node_id=[0]):
                    if not node:
                        return None
                    this_id = node_id[0]
                    node_id[0] += 1
                    return {
                        'id': this_id,
                        'value': getattr(node, 'val', None),
                        'left': serialize_tree(getattr(node, 'left', None), node_id),
                        'right': serialize_tree(getattr(node, 'right', None), node_id)
                    }
                root_serialized = serialize_tree(var_value)
                if root_serialized:
                    visual = {'type': 'binary-tree', 'root': root_serialized, 'name': var_name}
                    visuals.append(visual)

        # Heap as binary tree visualization
        for var_name, var_value in local_vars.items():
            if isinstance(var_value, list) and 'heap' in var_name.lower() and len(var_value) > 0:
                def array_to_tree(arr, i=0, node_id=[0]):
                    if i >= len(arr):
                        return None
                    this_id = node_id[0]
                    node_id[0] += 1
                    return {
                        'id': this_id,
                        'value': arr[i],
                        'left': array_to_tree(arr, 2 * i + 1, node_id),
                        'right': array_to_tree(arr, 2 * i + 2, node_id)
                    }
                root_serialized = array_to_tree(var_value)
                # Map array pointers to tree node ids (id == index)
                array_pointers = detect_pointers(local_vars, len(var_value))
                tree_pointers = {int(idx): names for idx, names in array_pointers.items()}
                if root_serialized:
                    visual = {'type': 'binary-tree', 'root': root_serialized, 'name': var_name + ' (as tree)', 'pointers': tree_pointers}
                    visuals.append(visual)

        # Grid/Chessboard detection (2D lists, chessboards, Sudoku, etc.)
        for var_name, var_value in local_vars.items():
            # Detect a 2D list (list of lists of uniform length, not strings)
            if (
                isinstance(var_value, list) and
                len(var_value) > 0 and
                all(isinstance(row, list) for row in var_value) and
                len(set(len(row) for row in var_value)) == 1
            ):
                rows = len(var_value)
                cols = len(var_value[0])
                cells = copy.deepcopy(var_value)
                cellStates = []
                for r in range(rows):
                    for c in range(cols):
                        v = var_value[r][c]
                        if isinstance(v, str):
                            if v in ['Q', 'K', 'N', 'B', 'R', 'P']:
                                cellStates.append({'row': r, 'col': c, 'state': 'piece', 'piece': v})
                            elif v == 'X':
                                cellStates.append({'row': r, 'col': c, 'state': 'blocked'})
                            elif v == '.':
                                continue
                        elif v == 1:
                            cellStates.append({'row': r, 'col': c, 'state': 'visited'})
                # Pointers for grid: look for variables that are (row, col) tuples or lists
                pointers = {}
                for k, v in local_vars.items():
                    if (
                        isinstance(v, (tuple, list)) and
                        len(v) == 2 and
                        all(isinstance(x, int) for x in v)
                        and 0 <= v[0] < rows and 0 <= v[1] < cols
                    ):
                        pointers[k] = v
                # Always add a pointer for (row, col) if both are present
                if 'row' in local_vars and 'col' in local_vars:
                    r, c = local_vars['row'], local_vars['col']
                    if isinstance(r, int) and isinstance(c, int) and 0 <= r < rows and 0 <= c < cols:
                        pointers['row,col'] = [r, c]
                # Also add single-index pointers for 1D row/col pointers
                for k, v in local_vars.items():
                    if isinstance(v, int):
                        if 0 <= v < rows:
                            pointers[k + '_row'] = [v, 0]
                        if 0 <= v < cols:
                            pointers[k + '_col'] = [0, v]
                paths = []
                for k, v in local_vars.items():
                    if (
                        isinstance(v, list) and
                        all(isinstance(x, (tuple, list)) and len(x) == 2 for x in v)
                    ):
                        if all(0 <= x[0] < rows and 0 <= x[1] < cols for x in v):
                            paths.append(v)
                visual = {
                    'type': 'grid',
                    'rows': rows,
                    'cols': cols,
                    'cells': cells,
                    'cellStates': cellStates,
                    'pointers': pointers,
                    'paths': paths,
                    'name': var_name
                }
                visuals.append(visual)
            # Special case: N-Queens/board solutions as list of strings
            elif (
                isinstance(var_value, list) and
                len(var_value) > 0 and
                all(isinstance(row, str) for row in var_value) and
                len(set(len(row) for row in var_value)) == 1 and
                all(len(row) == len(var_value) for row in var_value)
            ):
                # Convert to 2D list of chars
                rows = len(var_value)
                cols = len(var_value[0])
                cells = [list(row) for row in var_value]
                cellStates = []
                for r in range(rows):
                    for c in range(cols):
                        v = cells[r][c]
                        if v in ['Q', 'K', 'N', 'B', 'R', 'P']:
                            cellStates.append({'row': r, 'col': c, 'state': 'piece', 'piece': v})
                        elif v == 'X':
                            cellStates.append({'row': r, 'col': c, 'state': 'blocked'})
                        elif v == '1':
                            cellStates.append({'row': r, 'col': c, 'state': 'visited'})
                visual = {
                    'type': 'grid',
                    'rows': rows,
                    'cols': cols,
                    'cells': cells,
                    'cellStates': cellStates,
                    'name': var_name
                }
                visuals.append(visual)

        # Only one visual type per step: prefer queue > stack > array
        has_queue = any(v.get('type') == 'queue' for v in visuals)
        has_heap_tree = any(v.get('type') == 'binary-tree' and 'heap' in v.get('name', '').lower() for v in visuals)
        if has_heap_tree:
            # Show only the heap tree, exclude all array/stack visuals (regardless of name)
            visuals = [v for v in visuals if v.get('type') == 'binary-tree' and 'heap' in v.get('name', '').lower()]
        elif has_queue:
            visuals = [v for v in visuals if v.get('type') == 'queue']

        # DEMO: If 'show_all_grid_states' is present and True, inject a demo grid with all states
        if local_vars.get('show_all_grid_states', False):
            demo_grid = [
                ['Q', 1, 'X', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
                ['.', '.', '.', '.', '.', '.', '.', '.'],
            ]
            demo_paths = [[(0,1), (0,2), (1,2), (2,2)]]
            demo_cellStates = [
                {'row': 0, 'col': 0, 'state': 'piece', 'piece': 'Q'},
                {'row': 0, 'col': 1, 'state': 'visited'},
                {'row': 0, 'col': 2, 'state': 'blocked'},
                {'row': 1, 'col': 2, 'state': 'solution'},
            ]
            visual = {
                'type': 'grid',
                'rows': 8,
                'cols': 8,
                'cells': demo_grid,
                'cellStates': demo_cellStates,
                'paths': demo_paths,
                'name': 'demo_grid_all_states'
            }
            visuals.append(visual)

        if visuals:
            step['visuals'] = visuals
            step['visual'] = visuals[0]  # For backward compatibility
    except Exception as e:
        step['debug_error'] = str(e)
        step['debug_vars'] = list(local_vars.keys())

def trace_lines(frame, event, arg):
    global steps
    # Only trace lines in the user's code (filename == '<string>')
    if frame.f_code.co_filename != '<string>':
        return
    if len(steps) > MAX_STEPS:
        return
    exclude_vars = {'copy'}
    # Use the global stdout_capture for output
    output = None
    try:
        output = stdout_capture.getvalue()[-1000:]
    except Exception:
        output = ''
    
    # Get all variables from all frames in the call stack, including globals
    all_vars = {}
    f = frame
    while f:
        if f.f_code.co_filename == '<string>':
            # Include both locals and globals
            for scope in (f.f_locals, f.f_globals):
                for k, v in scope.items():
                    if (not k.startswith('__') and k not in exclude_vars and 
                        not str(type(v)).startswith("<class 'module'") and
                        k not in ['List', 'Dict', 'Set', 'Tuple', 'Optional', 'ListNode', 'TreeNode', 'Node',
                                 'traverse', 'print_list', 'create_linked_list', 'list_to_array', 'print_tree']):
                        all_vars[k] = safe_serialize(v)
        f = f.f_back
    
    if event == 'call':
        try:
            lineno = frame.f_lineno
            function_name = frame.f_code.co_name
            
            # Filter out injected utility functions and classes
            local_vars = {}
            for k, v in frame.f_locals.items():
                if (not k.startswith('__') and k not in exclude_vars and 
                    not str(type(v)).startswith("<class 'module'") and
                    k not in ['List', 'Dict', 'Set', 'Tuple', 'Optional', 'ListNode', 'TreeNode', 'Node',
                             'traverse', 'print_list', 'create_linked_list', 'list_to_array', 'print_tree']):
                    local_vars[k] = safe_serialize(v)
            
            function_args = {}
            try:
                args, _, _, values = inspect.getargvalues(frame)
                function_args = {arg: safe_serialize(values[arg]) for arg in args if arg not in exclude_vars}
            except Exception:
                pass
            call_stack = []
            f = frame
            while f:
                call_stack.append({
                    'function': f.f_code.co_name,
                    'filename': f.f_code.co_filename,
                    'line_number': f.f_lineno
                })
                f = f.f_back
            call_stack = call_stack[::-1]
            
            # Detect operation based on function name
            operation = None
            operation_value = None
            if function_name == 'push' and 'value' in function_args:
                operation = 'push'
                operation_value = function_args['value']
            elif function_name == 'pop':
                operation = 'pop'
            elif function_name == 'peek':
                operation = 'peek'
            
            step = {
                'line': lineno,
                'variables': all_vars,  # Use all variables from call stack and globals
                'function_args': function_args,
                'output': output,
                'call_stack': call_stack,
                'current_line': lineno,
                'note': f'function entry: {function_name}',
                'operation': operation,
                'operationValue': operation_value
            }
            detect_visuals(frame.f_locals, step)  # <--- FIX: use live locals
            scalars = {k: v for k, v in all_vars.items() if isinstance(v, (int, float, str, bool)) and k not in exclude_vars}
            if scalars:
                step['scalars'] = scalars
            steps.append(step)
        except Exception as e:
            steps.append({'error': sanitize_unicode(f'Error at function entry (line {frame.f_lineno}): {str(e)}')})
    
    if event == 'line':
        try:
            lineno = frame.f_lineno
            
            # Filter out injected utility functions and classes
            local_vars = {}
            for k, v in frame.f_locals.items():
                if (not k.startswith('__') and k not in exclude_vars and 
                    not str(type(v)).startswith("<class 'module'") and
                    k not in ['List', 'Dict', 'Set', 'Tuple', 'Optional', 'ListNode', 'TreeNode', 'Node',
                             'traverse', 'print_list', 'create_linked_list', 'list_to_array', 'print_tree']):
                    local_vars[k] = safe_serialize(v)
            
            function_args = {}
            try:
                args, _, _, values = inspect.getargvalues(frame)
                function_args = {arg: safe_serialize(values[arg]) for arg in args if arg not in exclude_vars}
            except Exception:
                pass
            call_stack = []
            f = frame
            while f:
                call_stack.append({
                    'function': f.f_code.co_name,
                    'filename': f.f_code.co_filename,
                    'line_number': f.f_lineno
                })
                f = f.f_back
            call_stack = call_stack[::-1]
            
            # Detect operation based on current line content
            operation = None
            operation_value = None
            current_function = frame.f_code.co_name
            if current_function == 'push' and 'value' in local_vars:
                operation = 'push'
                operation_value = local_vars.get('value')
            elif current_function == 'pop':
                operation = 'pop'
            elif current_function == 'peek':
                operation = 'peek'
            
            step = {
                'line': lineno,
                'variables': all_vars,  # Use all variables from call stack and globals
                'function_args': function_args,
                'output': output,
                'call_stack': call_stack,
                'current_line': lineno,
                'operation': operation,
                'operationValue': operation_value
            }
            detect_visuals(frame.f_locals, step)  # <--- FIX: use live locals
            scalars = {k: v for k, v in all_vars.items() if isinstance(v, (int, float, str, bool)) and k not in exclude_vars}
            if scalars:
                step['scalars'] = scalars
            steps.append(step)
        except Exception as e:
            steps.append({'error': sanitize_unicode(f'Error at line {frame.f_lineno}: {str(e)}')})
    
    if event == 'return':
        try:
            lineno = frame.f_lineno
            function_name = frame.f_code.co_name
            
            # Filter out injected utility functions and classes
            local_vars = {}
            for k, v in frame.f_locals.items():
                if (not k.startswith('__') and k not in exclude_vars and 
                    not str(type(v)).startswith("<class 'module'") and
                    k not in ['List', 'Dict', 'Set', 'Tuple', 'Optional', 'ListNode', 'TreeNode', 'Node',
                             'traverse', 'print_list', 'create_linked_list', 'list_to_array', 'print_tree']):
                    local_vars[k] = safe_serialize(v)
            
            call_stack = []
            f = frame
            while f:
                call_stack.append({
                    'function': f.f_code.co_name,
                    'filename': f.f_code.co_filename,
                    'line_number': f.f_lineno
                })
                f = f.f_back
            call_stack = call_stack[::-1]
            
            step = {
                'line': lineno,
                'variables': all_vars,  # Use all variables from call stack and globals
                'output': output,
                'call_stack': call_stack,
                'current_line': lineno,
                'note': f'function return: {function_name}',
                'return_value': safe_serialize(arg)
            }
            detect_visuals(frame.f_locals, step)  # <--- FIX: use live locals
            scalars = {k: v for k, v in all_vars.items() if isinstance(v, (int, float, str, bool)) and k not in exclude_vars}
            if scalars:
                step['scalars'] = scalars
            steps.append(step)
        except Exception as e:
            steps.append({'error': sanitize_unicode(f'Error at function return (line {frame.f_lineno}): {str(e)}')})
    
    return trace_lines

def prepare_code(user_code):
    import sys  # Import sys at the top of the function
    
    # SMART APPROACH: Check if user has test cases, only inject if they don't
    # Check if this looks like linked list code
    is_linked_list_code = (
        'ListNode' in user_code or 
        'head' in user_code or 
        'next' in user_code or
        'linked' in user_code.lower() or
        'node' in user_code.lower()
    )
    
    # Check if user already has test cases (look for common patterns)
    has_test_cases = (
        'print(' in user_code or
        'head =' in user_code or
        'root =' in user_code or
        'arr =' in user_code or
        'nums =' in user_code or
        'target =' in user_code or
        'test' in user_code.lower() or
        'example' in user_code.lower() or
        'main' in user_code.lower()
    )
    
    if is_linked_list_code:
        class_defs = '''class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Common utility functions
def traverse(head):
    """Traverse and print linked list"""
    current = head
    while current:
        if current.next:
            print(current.val, end=" -> ")
        else:
            print(current.val)
        current = current.next

def print_list(head):
    """Print linked list (alias for traverse)"""
    traverse(head)

def create_linked_list(values):
    """Create linked list from list of values"""
    if not values:
        return None
    head = ListNode(values[0])
    current = head
    for val in values[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

def list_to_array(head):
    """Convert linked list to array"""
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

def print_tree(root, level=0):
    """Print binary tree in a readable format"""
    if root is None:
        return
    print_tree(root.right, level + 1)
    print("  " * level + str(root.val))
    print_tree(root.left, level + 1)'''
        
        # Only inject test data if user doesn't have test cases
        if not has_test_cases:
            var_defs = '''head = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))
root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
arr = [64, 34, 25, 12, 22, 11, 90]
nums = [3, 2, 4, 1, 5]
target = 6'''
            modified_code = class_defs + '\n\n' + var_defs + '\n\n' + user_code
        else:
            # User has test cases, only inject classes
            modified_code = class_defs + '\n\n' + user_code
    else:
        # For non-linked list code, just add typing imports if needed
        typing_types = ['List', 'Dict', 'Tuple', 'Set', 'Optional']
        typing_needed = [t for t in typing_types if re.search(r'\b' + t + r'\[', user_code) and f'from typing import {t}' not in user_code]
        if typing_needed:
            typing_imports = 'from typing import ' + ', '.join(typing_needed) + '\n'
            modified_code = typing_imports + user_code
        else:
            modified_code = user_code

    return modified_code

def run_user_code(user_code):
    global steps
    steps = []
    original_stdout = sys.stdout
    sys.stdout = io.StringIO()
    error = None
    result = None
    def target():
        nonlocal error, result
        try:
            exec_globals = {}
            lines = user_code.split('\n')
            initial_arrays = {}
            for line in lines:
                line = line.strip()
                if '=' in line and '[' in line and ']' in line:
                    try:
                        if 'arr' in line and '=' in line:
                            start = line.find('[')
                            end = line.find(']')
                            if start != -1 and end != -1:
                                arr_str = line[start+1:end]
                                if arr_str:
                                    exec(f"temp_arr = [{arr_str}]", {}, initial_arrays)
                                    if 'temp_arr' in initial_arrays:
                                        initial_arrays['arr'] = initial_arrays['temp_arr']
                                        del initial_arrays['temp_arr']
                    except Exception:
                        pass
            # Only modify the function call line to add .copy(), not the definition
            print("DEBUG: About to call prepare_code", file=sys.stderr)
            modified_code = prepare_code(user_code)
            print("DEBUG: prepare_code completed", file=sys.stderr)
            
            if initial_arrays:
                if 'import copy' not in modified_code:
                    modified_code = 'import copy\n' + modified_code
                for arr_name in initial_arrays.keys():
                    pattern = rf'(?<!def )bubble_sort\({arr_name}\)'
                    modified_code = re.sub(pattern, f'bubble_sort({arr_name}.copy())', modified_code)
                    for fname in ['quick_sort', 'merge_sort', 'insertion_sort', 'selection_sort']:
                        pattern = rf'(?<!def ){fname}\({arr_name}\)'
                        modified_code = re.sub(pattern, f'{fname}({arr_name}.copy())', modified_code)
            sys.settrace(trace_lines)
            try:
                exec(modified_code, exec_globals, exec_globals)
            except NameError as ne:
                # On NameError, re-prepare the code (in case the user's code changed globals)
                modified_code = prepare_code(user_code)
                exec(modified_code, exec_globals, exec_globals)
            if initial_arrays:
                arr_name, arr_values = next(iter(initial_arrays.items()))
                initial_step = {
                    'line': 0,
                    'variables': {arr_name: arr_values},
                    'output': '',
                    'call_stack': [],
                    'current_line': 0,
                    'visual': {'type': 'array', 'values': arr_values, 'name': arr_name},
                    'initial': True
                }
                steps.insert(0, initial_step)
        except Exception as e:
            error = traceback.format_exc()
            # Try to provide more helpful error messages
            if "NameError: name 'head' is not defined" in str(e):
                error = "Error: Variable 'head' is not defined. Make sure to create your linked list first.\n\nExample:\nhead = ListNode(1, ListNode(2, ListNode(3)))\n\n" + error
            elif "NameError: name" in str(e):
                # Extract the undefined variable name
                match = re.search(r"NameError: name '([^']+)' is not defined", str(e))
                if match:
                    var_name = match.group(1)
                    error = f"Error: Variable '{var_name}' is not defined. Make sure to define it before using it.\n\n" + error
        finally:
            sys.settrace(None)
            sys.stdout = original_stdout
    thread = threading.Thread(target=target)
    thread.start()
    thread.join(timeout=10)  # 10 second timeout
    if thread.is_alive():
        error = sanitize_unicode('Execution timed out.')
    if error:
        steps.append({'error': sanitize_unicode(error)})
    return steps

def sanitize_unicode(obj):
    if isinstance(obj, str):
        # Replace surrogates with the replacement character
        return obj.encode('utf-8', 'replace').decode('utf-8')
    elif isinstance(obj, list):
        return [sanitize_unicode(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: sanitize_unicode(v) for k, v in obj.items()}
    return obj

def main():
    global stdout_capture
    try:
        # Set up timeout
        timer = threading.Timer(8.0, timeout_handler)
        timer.start()
        
        # Capture stdout
        old_stdout = sys.stdout
        stdout_capture = io.StringIO()
        sys.stdout = stdout_capture
        
        # Read code from stdin
        code = sys.stdin.read()
        
        # Inject common imports and utilities
        code_to_inject = """
# Common imports
from typing import List, Dict, Set, Tuple, Optional
import copy

# Common data structure classes
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Common utility functions
def traverse(head):
    current = head
    while current:
        print(current.val, end=" -> " if current.next else "\\n")
        current = current.next

def print_list(head):
    traverse(head)

def create_linked_list(values):
    if not values:
        return None
    head = ListNode(values[0])
    current = head
    for val in values[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

def list_to_array(head):
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

def print_tree(root, level=0):
    if root is None:
        return
    print_tree(root.right, level + 1)
    print("  " * level + str(root.val))
    print_tree(root.left, level + 1)

# Test data (only if no user test cases detected)
"""
        
        # Check if user has test cases
        has_test_cases = any(keyword in code.lower() for keyword in [
            'print(', 'head =', 'root =', 'arr =', 'test', 'example', 'sample'
        ])
        
        if not has_test_cases:
            code_to_inject += """
# Common test data
head = create_linked_list([1, 2, 3, 4, 5])
root = TreeNode(1, TreeNode(2), TreeNode(3))
arr = [64, 34, 25, 12, 22, 11, 90]
"""
        
        # Combine injected code with user code
        full_code = code_to_inject + "\n" + code
        
        # Create a new namespace for execution
        namespace = {}
        namespace['__name__'] = '__main__'  # Ensure main block runs
        
        # Execute the code
        exec(full_code, namespace, namespace)
        
        # Stop timeout timer
        timer.cancel()
        
        # Get the final output
        output = stdout_capture.getvalue()
        sys.stdout = old_stdout
        
        # Set up tracing
        sys.settrace(trace_lines)
        
        # Execute again with tracing
        stdout_capture = io.StringIO()  # Clear output for tracing run
        sys.stdout = stdout_capture
        exec(full_code, namespace, namespace)
        sys.stdout = old_stdout
        
        # Stop tracing
        sys.settrace(None)
        
        # Add initial step showing original state
        if steps and steps[0].get('visuals'):
            initial_step = {
                'line': 0,
                'variables': {},
                'output': '',
                'call_stack': [],
                'current_line': 0,
                'note': 'initial state',
                'visuals': steps[0]['visuals']
            }
            steps.insert(0, initial_step)
        
        # Output the trace as JSON
        print(json.dumps(sanitize_unicode(steps), indent=2, ensure_ascii=False))
        
    except TimeoutException:
        sys.stdout = old_stdout
        print(json.dumps([{'error': sanitize_unicode('Execution timed out after 8 seconds.')}], indent=2, ensure_ascii=False))
    except Exception as e:
        sys.stdout = old_stdout
        print(json.dumps([{'error': sanitize_unicode(f'Error: {str(e)}')}], indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main() 