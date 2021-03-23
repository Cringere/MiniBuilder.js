# MiniBuilder.js
A small library for building static websites using templated HTML files.

## Usage
### Implementation
To use the API, simply copy `src/MiniBuilder.js` to your project's directory.

### Example
Imagine you have the following file hierarchy:

	root/
	├─ index.html
	├─ MiniBuilder.js
	├─ templates/
	│  ├─ t1.html
	│  ├─ t2.html

With your main file being `index.html` and the two templated files `t1.html` and `t2.html`.
In `index.html`, we can place a script that will feed `t1.html` and `t2.html` to a `Builder` object that will
generate the webpage.

`index.html`:
	
	...
	<script src="./MiniBuilder.js"></script>
	<script>
		//create the builder
		const builder = new Builder()

		//add some templates
		builder.add(
			//the name of the templated file
			't1.html',
			//An object whose keys are the variable names
			//and the values are the variable's values 
			{
				var1: 'Hello',
				var2: 'World',
			}
		)
		
		builder.add('t2.html', {
				second: 'some text'
			}
		)
		
		//build your webpage (note that this is an async function)
		builder.update(document)
	</script>
	...

#### Variables
Variables are a great way to make small modifications to you templated file.
The API will replace any variables it finds in the HTML with the value you specified
it in the javascript `builder.add` call.
The syntax for implementing a variable is `{{` followed by the variable's name followed by `}}`.
For example, in `t1.html`:
	
	<div>
		<p>{{var1}} {{var2}}</p>
	</div>

#### Logic
You can also add some simple logic. For example, in `t2.html`:
	
	<div>
		{{if first}}
			<p class="class-1 class-2 class-3">This is the first sentence.</p>
		{{endif}}
		{{if second}}
			<p class="class-4 class-5 class-6">This is the second sentence.</p>
		{{endif}}
	</div>
	
The first `p` will be included in the final webpage if a variable named `first` exists. Otherwise the lines
between that `if` and `endif` will be ignored. The same is applied to `second`.

For a fully fleshed out example, check out the `example`.

### File hierarchy
By default, the API expects the templated files to be in a folder named `templates`, and a path to the root of the directory.
That can be changed by passing in different paths to the `Builder` constructor.
For example:

	root/
	├─ MiniBuilder.js
	├─ some_other_templates/
	│  ├─ one.html
	│  ├─ two.html
	├─ main_files/
	│  ├─ index.html

Will require the following initialization (from `index.html`):

	...
	<script src="../MiniBuilder.js"></script>
	<script>
		//create the builder
		const builder = new Builder('..', 'some_other_templates')
	...
