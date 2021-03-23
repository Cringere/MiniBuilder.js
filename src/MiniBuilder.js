
async function read(file_path) {
	const v = await fetch(file_path)
	const data = await v.text()
	return data
}

/*
grammar:

lines			-> statement lines
statement		-> VARIABLE
statement		-> SOURCE
statement		-> ifStatement
ifStatement		-> IF_FUNC lines ENDIF_FUNC

SOURCE		is simply a chuck of html code
VARIABLE	:= {{NAME}}
IF_FUNC		:= {{if SOME_TEXT}}
ENDIF_VAR	:= {{endif}}
*/

/*
Helper class.

input: templated HTML source
output: an array of tokens. Each token can be one of the following:
	source	- regular html code
	if		- an if statement
	endif	- an endif statement
	var		- a reference to a variable
*/
class Scanner {
	static tokenize(txt) {
		//split the text into tokens
		const re = /{{([^{]+)}}/g
		let tokens = []
		let lastCut = 0;
		do {
			const m = re.exec(txt)
			if (m) {
				//push source
				tokens.push(txt.substr(lastCut, m.index - lastCut))

				//push variable
				tokens.push(txt.substr(m.index, m[0].length))

				lastCut = m.index + m[0].length

			} else
				break
		} while (true)
		//push rest
		tokens.push(txt.substr(lastCut, txt.length - lastCut))

		//filter empty strings
		tokens = tokens.filter(t => t.length != 0)

		return Scanner.parameterize(tokens)

	}

	static parameterize(incompleteTokens) {
		const ifRe = /{{if\s+([^}]+)}}/
		const endifRe = /{{endif}}/
		const varRe = /{{([^}\s]+)}}/
		return incompleteTokens.map(t => {
			if (!t.startsWith('{{')) return {
				source: t
			}

			let m
			if (m = ifRe.exec(t)) return {
				if: m[1]
			}
			if (m = endifRe.exec(t)) return {
				endif: 'endif'
			}
			if (m = varRe.exec(t)) return {
				var: m[1]
			}
			console.error('Unknown token: ' + t);
		})
	}
}

/*
Helper class.

Builds an Abstract Syntax Tree (AST) out of a tokens array.
*/
class Parser {
	constructor(tokens) {
		this.tokens = tokens
		this.i = 0
	}

	seeSource() {
		return this.tokens[this.i].source != undefined
	}

	seeVariable() {
		return this.tokens[this.i].var != undefined
	}

	seeIf() {
		return this.tokens[this.i].if != undefined
	}

	seeEndif() {
		return this.tokens[this.i].endif != undefined
	}

	next() {
		if (this.i >= this.tokens.length) {
			console.error('code block not closed');
		}
		let t = this.tokens[this.i]
			++this.i
		return t
	}

	parseIf() {
		let cond = this.next().if
		let lines = this.parseLines()
		this.next()
		return {
			if: {
				cond: cond,
				lines: lines
			}
		}
	}

	parseLines() {
		let statements = []
		while (this.i < this.tokens.length) {
			if (this.seeSource() || this.seeVariable()) {
				statements.push(this.next())
			} else if (this.seeIf()) {
				statements.push(this.parseIf())
			} else
				break
		}
		return {
			lines: {
				statements: statements
			}
		}
	}

	buildAST() {
		this.i = 0
		return this.parseLines()
	}
}

/*
Helper class.

Evaluates an AST and returns the resulting HTML.
*/
class Evaluator {
	constructor(ast, variables, globalVariables) {
		this.ast = ast

		//transform add all variables into a map
		let vars = new Map()
		
		for (let key in variables) vars.set(key, variables[key])
		
		for (let key in globalVariables) vars.set(key,globalVariables[key])
		
		this.variables = vars
	}

	getVariable(variable) {
		const val = this.variables.get(variable)
		if (val == undefined)
			console.warn('Varaible ' + variable + ' was not found.');
		return val
	}

	evaluateCondition(cond) {
		return this.variables.has(cond)
	}

	evaluate(node) {
		node = node || this.ast

		if (node.source) {

			return node.source
		}

		if (node.var) {
			return this.getVariable(node.var)
		}

		if (node.lines) {
			let s = ''
			for (let i = 0; i < node.lines.statements.length; ++i)
				s += this.evaluate(node.lines.statements[i])
			return s
		}

		if (node.if) {
			if (this.evaluateCondition(node.if.cond)) {
				return this.evaluate(node.if.lines)
			}
			return ''
		}

		//this line should never be reached
		console.error('Evaluator Error.');
		return undefined
	}
}

/*
The main class of the api.
Use it to add templates, and then update your page.
*/
class Builder {
	constructor(rootFolder, templatesFolder) {
		this.domSources = []

		this.articleTemplate = undefined

		this.globalVariables = {}
		this.globalVariables.root_folder = rootFolder || '.'
		this.globalVariables.templates_folder = templatesFolder || 'templates'

		this.activePromises = []
	}

	add(file, variables) {
		//allocate place for the file
		const i = this.domSources.length
		this.domSources.push('')

		this.activePromises.push(read(this.globalVariables.root_folder + '/' + this.globalVariables.templates_folder + '/' + file).then(source => {
			const tokens = Scanner.tokenize(source)

			const parser = new Parser(tokens)
			const ast = parser.buildAST()

			const evaluator = new Evaluator(ast, variables, this.globalVariables)
			const result = evaluator.evaluate()

			this.domSources[i] = result
		}))
	}

	async update(document) {
		return Promise.all(this.activePromises).then(() => {
			//get the body of the HTML document
			const body = document.getElementsByTagName('body')[0]

			//TODO: should all content be stored in a div?
			//put all constructed elements in a single div and append all to the document's body
			//const element = document.createElement('div')
			// body.appendChild(element)

			//add all the parsed code to the body's html
			this.domSources.forEach(s => body.innerHTML += s)

			//clear
			this.activePromises = []
			this.domSources = []
		})
	}
}