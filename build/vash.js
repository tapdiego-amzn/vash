/**
 * Vash - JavaScript Template Parser, v0.5.3-1272
 *
 * https://github.com/kirbysayshi/vash
 *
 * Copyright (c) 2012 Andrew Petersen
 * MIT License (LICENSE)
 */
 
/*jshint strict:false, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */

;(function(vash){

	// this pattern was inspired by LucidJS,
	// https://github.com/RobertWHurst/LucidJS/blob/master/lucid.js

	if(typeof define === 'function' && define['amd']){
		define(vash); // AMD
	} else if(typeof module === 'object' && module['exports']){
		module['exports'] = vash; // NODEJS
	} else {
		window['vash'] = vash; // BROWSER
	}

})(function(exports){

	var vash = exports; // neccessary for nodejs references

	exports["version"] = "0.5.3-1272";
	exports["config"] = {
		 "useWith": false
		,"modelName": "model"
		,"helpersName": "html"
		,"htmlEscape": true
		,"debug": true
		,"debugParser": false
		,"debugCompiler": false

		,"favorText": false

		,"saveTextTag": false
		,"saveAT": false
	};

	/************** Begin injected code from build script */
	/*jshint strict:false, asi: false, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */
;(function(){

	///////////////////////////////////////////////////////////////////////////
	// CONFIG
	// Ideally this is where any helper-specific configuration would go, things
	// such as syntax highlighting callbacks, whether to temporarily disable
	// html escaping, and others.
	// 
	// Each helper should define it's configuration options just above its own
	// definition, for ease of modularity and discoverability.

	// grab/create the global. sigh.
	vash = typeof vash === 'undefined'
		? typeof window !== 'undefined'
			? ( window.vash = window.vash || {} )
			: typeof module !== 'undefined' && module.exports
				? exports = {}
				: {}
		: vash;

	var helpers = (vash['helpers'] = vash['helpers'] || {});
	
	vash.helpers.config = {};

	// CONFIG
	///////////////////////////////////////////////////////////////////////////


	///////////////////////////////////////////////////////////////////////////
	// HTML ESCAPING

	var HTML_REGEX = /[&<>"'`]/g
		,HTML_REPLACER = function(match) { return HTML_CHARS[match]; }
		,HTML_CHARS = {
			"&": "&amp;"
			,"<": "&lt;"
			,">": "&gt;"
			,'"': "&quot;"
			,"'": "&#x27;"
			,"`": "&#x60;"
		};


	// raw: explicitly prevent an expression or value from being HTML escaped.

	helpers.raw = function( val ) {
		var func = function() { return val; }
		
		val = val != null ? val : "";		
		
		return {
			 toHtmlString: func
			,toString: func
		};
	}
		
	helpers.escape = function( val ) {
		var	func = function() { return val; }

		val = val != null ? val : "";
		
		if ( typeof val.toHtmlString !== "function" ) {
			
			val = val.toString().replace( HTML_REGEX, HTML_REPLACER );

			return {
				 toHtmlString: func
				,toString: func
			};
		}
		
		return val;
	}

	// HTML ESCAPING
	///////////////////////////////////////////////////////////////////////////

	///////////////////////////////////////////////////////////////////////////
	// BUFFER MANIPULATION
	//
	// These are to be used from within helpers, to allow for manipulation of
	// output in a sane manner. 

	helpers.buffer = (function(){ 
		var helpers = helpers;
		
		return {

			mark: function(){
				return helpers.__vo.length;
			}

			,empty: function(){
				return helpers.__vo.splice(0, helpers.__vo.length);
			}

			,fromMark: function(mark){
				return helpers.__vo.splice(mark, helpers.__vo.length);
			}

			,push: function(buffer){
				if( buffer instanceof Array ) {
					helpers.__vo.push.apply( helpers.__vo, buffer );
				} else if (arguments.length > 1){
					helpers.__vo.push.apply( helpers.__vo, Array.prototype.slice.call(arguments) );
				} else {
					helpers.__vo.push(buffer);
				}
			}

		} 
	}());

	// BUFFER MANIPULATION
	///////////////////////////////////////////////////////////////////////////

	///////////////////////////////////////////////////////////////////////////
	// ERROR REPORTING 

	// Liberally modified from https://github.com/visionmedia/jade/blob/master/jade.js
	helpers.reportError = function(e, lineno, chr, orig, lb){

		lb = lb || '!LB!';

		var lines = orig.split(lb)
			,contextSize = lineno == 0 && chr == 0 ? lines.length - 1 : 3
			,start = Math.max(0, lineno - contextSize)
			,end = Math.min(lines.length, lineno + contextSize);

		var contextStr = lines.slice(start, end).map(function(line, i, all){
			var curr = i + start + 1;

			return (curr === lineno ? '  > ' : '    ')
				+ curr
				+ ' | '
				+ line;
		}).join('\n');

		e.message = 'Problem while rendering template at line '
			+ lineno + ', character ' + chr
			+ '.\nOriginal message: ' + e.message + '.'
			+ '\nContext: \n\n' + contextStr + '\n\n';

		throw e;
	}
}());

/*jshint strict:false, asi:true, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */
;(function(){

	var helpers = vash.helpers;

	///////////////////////////////////////////////////////////////////////////
	// EXAMPLE HELPER: syntax highlighting

	helpers.config.highlighter = null;

	helpers.highlight = function(lang, cb){

		// context (this) is vash.helpers

		// mark() returns, for now, the current length of the internal buffer.
		// Use it to easily capture output...
		var startMark = this.buffer.mark();

		// cb() is simply a user-defined function. It could (and should) contain
		// buffer additions, so we call it...
		cb();

		// ... and then use fromMark() to grab the output added by cb().
		// Allowing the user to have functions mitigates having to do a lot of 
		// manual string concatenation within a helper.
		var cbOutLines = this.buffer.fromMark(startMark);

		// The internal buffer should now be back to where it was before this 
		// helper started.

		this.buffer.push( '<pre><code>' );

		// 
		if( helpers.config.highlighter ){
			this.buffer.push( helpers.config.highlighter(lang, cbOutLines.join('')).value );
		} else {
			this.buffer.push(cbOutLines);
		}

		this.buffer.push( '</code></pre>' );

		// returning is allowed, but could cause surprising effects. A return
		// value will be directly added to the output.
	}

}());

;(function(){


	///////////////////////////////////////////////////////////////////////////
	// LAYOUT HELPERS 
	
	// semi hacky guard to prevent non-nodejs erroring
	if( typeof window === 'undefined' ){
		var fs = require('fs')
	}

	var helpers = vash.helpers;

	// TRUE implies that all TPLS are loaded and waiting in cache
	helpers.config.browser = false;

	helpers.tplcache = {};
	helpers.blocks = {};
	helpers.appends = [];
	helpers.prepends = [];

	vash.loadFile = function(filepath, options, cb){

		// options are passed in via Express
		// { 
		//   settings: 
		//   { 
		//      env: 'development',
		//   	'jsonp callback name': 'callback',
		//   	'json spaces': 2,
		//   	views: '/Users/drew/Dropbox/js/vash/test/fixtures/views',
		//   	'view engine': 'vash'
		//   },
		//   _locals: [Function: locals],
		//   cache: false
		// }
	
		// extend works from right to left, using first arg as target
		options = vQuery.extend( {}, vash.config, options || {} );

		var browser = helpers.config.browser
			,tpl

		// this is pretty hacky, probably won't work in browser
		if( !browser && options.settings && options.settings.views && options.settings['view engine'] ){
			filepath = filepath.indexOf(options.settings.views) > -1
				? filepath
				: options.settings.views 
					+ '/' + filepath 
					+ '.' + options.settings['view engine'];
		} 		
		
		// if browser, tpl must exist in tpl cache
		tpl = options.cache || browser
			? helpers.tplcache[filepath] || ( helpers.tplcache[filepath] = vash.compile(fs.readFileSync(filepath, 'utf8')) )
			: vash.compile( fs.readFileSync(filepath, 'utf8') )

		cb && cb(null, tpl);
	}
	
	vash.renderFile = function(filepath, options, cb){

		vash.loadFile(filepath, options, function(err, tpl){
			cb(err, tpl(options));
		})
	}

	helpers.extends = function(path, ctn){
		var  self = this
			,origModel = this.model;

		// this is a synchronous callback
		vash.loadFile(path, this.model, function(err, tpl){
			ctn(self.model); // the child content
			tpl(self.model); // the tpl being extended
		})

		this.model = origModel;
	}
	
	helpers.include = function(name, model){

		var self = this, origModel = this.model;

		// this is a synchronous callback
		vash.loadFile(name, this.model, function(err, tpl){
			tpl(model || self.model);
		})

		this.model = origModel;
	}
	
	helpers.block = function(name, ctn){
		var bstart, ctnLines, self = this;

		// Because this is at RUNTIME, blocks are tricky. Blocks can "overwrite"
		// each other, but the "highest level" block must not have a callback.
		// This signifies that it should render out, instead of replacing.
		// In the future, this should be handled at compile time, which would
		// remove this restriction.

		if( !ctn ){

			if( this.hasPrepends(name) ){
				this.prepends[name].forEach(function(a){ a(self.model); });
				this.prepends[name].length = 0;
			}

			if( this.hasBlock(name) ){
				this.blocks[name](this.model);
				delete this.blocks[name];
			}

			if( this.hasAppends(name) ){
				this.appends[name].forEach(function(a){ a(self.model); });
				this.appends[name].length = 0;
			}
		}

		if( ctn ){
			this.blocks[name] = ctn;
		}
	}

	helpers.append = function(name, ctn){

		if( !this.appends[name] ){
			this.appends[name] = [];
		}

		this.appends[name].push(ctn);
	}

	helpers.prepend = function(name, ctn){
	
		if( !this.prepends[name] ){
			this.prepends[name] = [];
		}

		this.prepends[name].push(ctn);
	}

	helpers.hasBlock = function(name){
		return typeof this.blocks[name] !== "undefined";	
	}

	helpers.hasPrepends = function(name){
		return this.prepends[name] && (this.prepends[name].length > 0);
	}

	helpers.hasAppends = function(name){
		return this.appends[name] && (this.appends[name].length > 0);
	}

}());

exports.__express = exports.renderFile;

/*jshint strict:false, asi:true, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */

// The basic tokens, defined as constants
var  AT = 'AT'
	,ASSIGN_OPERATOR = 'ASSIGN_OPERATOR'
	,AT_COLON = 'AT_COLON'
	,AT_STAR_CLOSE = 'AT_STAR_CLOSE'
	,AT_STAR_OPEN = 'AT_STAR_OPEN'
	,BACKSLASH = 'BACKSLASH'
	,BRACE_CLOSE = 'BRACE_CLOSE'
	,BRACE_OPEN = 'BRACE_OPEN'
	,CONTENT = 'CONTENT'
	,DOUBLE_QUOTE = 'DOUBLE_QUOTE'
	,EMAIL = 'EMAIL'
	,FAT_ARROW = 'FAT_ARROW'
	,FUNCTION = 'FUNCTION'
	,HARD_PAREN_CLOSE = 'HARD_PAREN_CLOSE'
	,HARD_PAREN_OPEN = 'HARD_PAREN_OPEN'
	,HTML_TAG_CLOSE = 'HTML_TAG_CLOSE'
	,HTML_TAG_OPEN = 'HTML_TAG_OPEN'
	,HTML_TAG_SELFCLOSE = 'HTML_TAG_SELFCLOSE'
	,IDENTIFIER = 'IDENTIFIER'
	,KEYWORD = 'KEYWORD'
	,LOGICAL = 'LOGICAL'
	,NEWLINE = 'NEWLINE'
	,NUMERIC_CONTENT = 'NUMERIC_CONTENT'
	,OPERATOR = 'OPERATOR'
	,PAREN_CLOSE = 'PAREN_CLOSE'
	,PAREN_OPEN = 'PAREN_OPEN'
	,PERIOD = 'PERIOD'
	,SINGLE_QUOTE = 'SINGLE_QUOTE'
	,TEXT_TAG_CLOSE = 'TEXT_TAG_CLOSE'
	,TEXT_TAG_OPEN = 'TEXT_TAG_OPEN'
	,WHITESPACE = 'WHITESPACE';

var PAIRS = {};

// defined through indexing to help minification
PAIRS[AT_STAR_OPEN] = AT_STAR_CLOSE;
PAIRS[BRACE_OPEN] = BRACE_CLOSE;
PAIRS[DOUBLE_QUOTE] = DOUBLE_QUOTE;
PAIRS[HARD_PAREN_OPEN] = HARD_PAREN_CLOSE;
PAIRS[PAREN_OPEN] = PAREN_CLOSE;
PAIRS[SINGLE_QUOTE] = SINGLE_QUOTE;
PAIRS[AT_COLON] = NEWLINE;



// The order of these is important, as it is the order in which
// they are run against the input string.
// They are separated out here to allow for better minification
// with the least amount of effort from me. :)

// NOTE: this is an array, not an object literal! The () around
// the regexps are for the sake of the syntax highlighter in my
// editor... sublimetext2

var TESTS = [

	EMAIL, (/^([a-zA-Z0-9._%\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,4})\b/)


	,AT_STAR_OPEN, (/^(@\*)/)
	,AT_STAR_CLOSE, (/^(\*@)/)


	,AT_COLON, (/^@\:/)
	,AT, (/^(@)/)


	,FAT_ARROW, (/^(\(.*?\)?\s*?=>)/)


	,PAREN_OPEN, (/^(\()/)
	,PAREN_CLOSE, (/^(\))/)


	,HARD_PAREN_OPEN, (/^(\[)/)
	,HARD_PAREN_CLOSE, (/^(\])/)


	,BRACE_OPEN, (/^(\{)/)
	,BRACE_CLOSE, (/^(\})/)


	,TEXT_TAG_OPEN, (/^(<text>)/)
	,TEXT_TAG_CLOSE, (/^(<\/text>)/)


	,HTML_TAG_SELFCLOSE, (/^(<[^@>]+?\/>)/)
	,HTML_TAG_OPEN, function(){
		return this.spewIf(this.scan(/^(<[^\/ >]+?[^>]*?>)/, HTML_TAG_OPEN), '@');
	}
	,HTML_TAG_CLOSE, (/^(<\/[^>@\b]+?>)/)


	,PERIOD, (/^(\.)/)
	,NEWLINE, function(){
		var token = this.scan(/^(\n)/, NEWLINE);
		if(token){
			this.lineno++;
			this.charno = 0;
		}
		return token;
	}
	,WHITESPACE, (/^(\s)/)
	,FUNCTION, (/^(function)(?![\d\w])/)
	,KEYWORD, (/^(case|catch|do|else|finally|for|function|goto|if|instanceof|return|switch|try|typeof|var|while|with)(?![\d\w])/)
	,IDENTIFIER, (/^([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)/)


	,OPERATOR, (/^(===|!==|==|!==|>>>|<<|>>|>=|<=|>|<|\+|-|\/|\*|\^|%|\:|\?)/)
	,ASSIGN_OPERATOR, (/^(\|=|\^=|&=|>>>=|>>=|<<=|-=|\+=|%=|\/=|\*=|=)/)
	,LOGICAL, (/^(&&|\|\||&|\||\^)/)


	,BACKSLASH, (/^(\\)/)
	,DOUBLE_QUOTE, (/^(\")/)
	,SINGLE_QUOTE, (/^(\')/)


	,NUMERIC_CONTENT, (/^([0-9]+)/)
	,CONTENT, (/^([^\s})@.]+?)/)

];

// This pattern and basic lexer code were originally from the
// Jade lexer, but have been modified:
// https://github.com/visionmedia/jade/blob/master/lib/lexer.js

function VLexer(str){
	this.input = this.originalInput = str.replace(/\r\n|\r/g, '\n');
	this.lineno = 1;
	this.charno = 0;
}

VLexer.prototype = {
	
	scan: function(regexp, type){
		var captures, token;
		if (captures = regexp.exec(this.input)) {
			this.input = this.input.substr((captures[0].length));
			
			token = {
				type: type
				,line: this.lineno
				,chr: this.charno
				,val: captures[1] || ''
				,toString: function(){
					return '[' + this.type
						+ ' (' + this.line + ',' + this.chr + '): '
						+ this.val + ']';
				}
			};

			this.charno += captures[0].length;
			return token;
		}
	}

	,spewIf: function(tok, ifStr){
		var parts, str;

		if(tok){
			parts = tok.val.split(ifStr);

			if(parts.length > 1){
				tok.val = parts.shift();

				str = ifStr + parts.join(ifStr);
				this.input = str + this.input;
				this.charno -= str.length;
			}
		}
		
		return tok;
	}

	,advance: function() {

		var i, name, test, result;

		for(i = 0; i < TESTS.length; i += 2){
			test = TESTS[i+1];
			test.displayName = TESTS[i];

			if(typeof test === 'function'){
				// assume complex callback
				result = test.call(this);
			}

			if(typeof test.exec === 'function'){
				// assume regex
				result = this.scan(test, TESTS[i]);
			}

			if( result ){
				return result;
			}
		}
	}
}

/*jshint strict:false, asi:true, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */

var vQuery = function(node){
	return new vQuery.fn.init(node);
}

vQuery.prototype.init = function(astNode){

	// handle mode string
	if(typeof astNode === 'string'){
		this.mode = astNode;
	}

	this.maxCheck();
}

vQuery.fn = vQuery.prototype.init.prototype = vQuery.prototype;

vQuery.fn.vquery = 'yep';
vQuery.fn.constructor = vQuery;
vQuery.fn.length = 0;
vQuery.fn.parent = null;
vQuery.fn.mode = null;
vQuery.fn.tagName = null;

vQuery.fn.beget = function(mode, tagName){
	var child = vQuery(mode);
	child.parent = this;
	this.push( child );

	if(tagName) { child.tagName = tagName; }

	this.maxCheck();

	return child;
}

vQuery.fn.closest = function(mode, tagName){
	var p = this;

	while(p){

		if( p.tagName !== tagName && p.parent ){
			p = p.parent;
		} else {
			break;
		}
	}

	return p;
}

vQuery.fn.pushFlatten = function(node){
	var n = node, i, children;

	while( n.length === 1 && n[0].vquery ){
		n = n[0];
	}

	if(n.mode !== PRG){
		this.push(n);
	} else {

		for(i = 0; i < n.length; i++){
			this.push( n[i] );
		}
	}

	this.maxCheck();

	return this;
}

vQuery.fn.push = function(nodes){

	if(vQuery.isArray(nodes)){
		if(nodes.vquery){
			nodes.forEach(function(node){ node.parent = this; }, this);
		}
		
		Array.prototype.push.apply(this, nodes);
	} else {
		if(nodes.vquery){
			nodes.parent = this;
		}
		
		Array.prototype.push.call(this, nodes);
	}

	this.maxCheck();

	return this.length;
}

vQuery.fn.root = function(){
	var p = this;

	while(p && p.parent && (p = p.parent)){}

	return p;
}

vQuery.fn.toTreeString = function(){
	var  buffer = []
		,indent = 1;

	function visitNode(node){
		var  children
			,child;

		buffer.push( Array(indent).join(' |') + ' +' + node.mode + ' ' + ( node.tagName || '' ) );

		indent += 1;
		children = node.slice();
		while( (child = children.shift()) ){

			if(child.vquery === vQuery.fn.vquery){
				// recurse
				visitNode(child);
			} else {
				buffer.push( Array(indent).join(' |') + ' '
					+ (child
						?  child.toString().replace(/(\r|\n)/g, '')
						: '[empty]')
				);
			}

		}

		indent -= 1;
		buffer.push( Array(indent).join(' |') + ' -' + node.mode + ' ' + ( node.tagName || '' ) );
	}

	visitNode(this);

	return buffer.join('\n');
}

vQuery.fn.maxCheck = function(last){
	if( this.length >= vQuery.maxSize ){
		var e = new Error();
		e.message = 'Maximum number of elements exceeded.\n'
			+ 'This is typically caused by an unmatched character or tag. Parse tree follows:\n'
			+ this.toTreeString();
		e.name = 'vQueryDepthException';
		throw e;
	}
}

vQuery.maxSize = 1000;

// takes a full nested set of vqueries (e.g. an AST), and flattens them 
// into a plain array. Useful for performing queries, or manipulation,
// without having to handle a lot of parsing state.
vQuery.fn.flatten = function(){
	var reduced;
	return this.reduce(function flatten(all, tok, i, orig){

		if( tok.vquery ){ 
			all.push( { type: 'META', val: 'START' + tok.mode, tagName: tok.tagName } );
			reduced = tok.reduce(flatten, all);
			reduced.push( { type: 'META', val: 'END' + tok.mode, tagName: tok.tagName } );
			return reduced;
		}
		
		// grab the mode from the original vquery container 
		tok.mode = orig.mode;
		all.push( tok );

		return all;
	}, []);
}

// take a flat array created via vQuery.fn.flatten, and recreate the 
// original AST. 
vQuery.reconstitute = function(arr){
	return arr.reduce(function recon(ast, tok, i, orig){

		if( tok.type === 'META' ) {
			ast = ast.parent;
		} else {

			if( tok.mode !== ast.mode ) {
				ast = ast.beget(tok.mode, tok.tagName);
			}

			ast.push( tok );
		}

		return ast;
	}, vQuery(PRG))
}

vQuery.isArray = function(obj){
	return Object.prototype.toString.call(obj) == '[object Array]';
}

vQuery.extend = function(obj){
	var next, i, p;

	for(i = 1; i < arguments.length; i++){
		next = arguments[i];

		for(p in next){
			obj[p] = next[p];
		}
	}

	return obj;
}

vQuery.takeMethodsFromArray = function(){
	var methods = [
		'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift',
		'concat', 'join', 'slice', 'indexOf', 'lastIndexOf',
		'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
	]

		,arr = []
		,m;

	for (var i = 0; i < methods.length; i++){
		m = methods[i];
		if( typeof arr[m] === 'function' ){
			if( !vQuery.fn[m] ){
				(function(methodName){
					vQuery.fn[methodName] = function(){
						return arr[methodName].apply(this, Array.prototype.slice.call(arguments, 0));
					}
				})(m);
			}
		} else {
			throw new Error('Vash requires ES5 array iteration methods, missing: ' + m);
		}
	}

}

vQuery.takeMethodsFromArray(); // run on page load

/*jshint strict:false, asi:true, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */

function VParser(tokens, options){

	this.options = options || {};
	this.tokens = tokens;
	this.ast = vQuery(PRG);
	this.prevTokens = [];
}

var PRG = "PROGRAM", MKP = "MARKUP", BLK = "BLOCK", EXP = "EXPRESSION" ;

VParser.prototype = {

	parse: function(){
		var curr, i, len, block;

		while( this.prevTokens.push( curr ), (curr = this.tokens.pop()) ){

			if(this.options.debugParser){
				console.log(this.ast && this.ast.mode, curr.type, curr, curr.val);
			}

			if(this.ast.mode === PRG || this.ast.mode === null){
				
				this.ast = this.ast.beget( this.options.initialMode || MKP );

				if(this.options.initialMode === EXP){
					this.ast = this.ast.beget( EXP ); // EXP needs to know it's within to continue
				}
			}

			if(this.ast.mode === MKP){
				this.handleMKP(curr);
				continue;
			}
			
			if(this.ast.mode === BLK){
				this.handleBLK(curr);
				continue;
			}
			
			if(this.ast.mode === EXP){
				this.handleEXP(curr);
				continue;
			}
		}

		this.ast = this.ast.root();

		if(this.options.debugParser && !this.options.initialMode){
			// this should really only output on the true root

			console.log(this.ast);
			console.log(this.ast.toTreeString());
		}
		
		return this.ast;
	}
	
	,exceptionFactory: function(e, type, tok){

		// second param is either a token or string?

		if(type == 'UNMATCHED'){

			e.name = "UnmatchedCharacterError";

			this.ast = this.ast.root();

			if(tok){
				e.message = 'Unmatched ' + tok.type
					//+ ' near: "' + context + '"'
					+ ' at line ' + tok.line
					+ ', character ' + tok.chr
					+ '. Value: ' + tok.val
					+ '\n ' + this.ast.toTreeString();
				e.lineNumber = tok.line;
			}
		}

		return e;
	}

	,advanceUntilNot: function(untilNot){
		var curr, next, tks = [];

		while( next = this.tokens[ this.tokens.length - 1 ] ){
			if(next.type === untilNot){
				curr = this.tokens.pop();
				tks.push(curr);
			} else {
				break;
			}
		}
		
		return tks;
	}

	,advanceUntilMatched: function(curr, start, end, startEscape, endEscape){
		var  next = curr
			,prev = null
			,nstart = 0
			,nend = 0
			,tks = [];
		
		// this is fairly convoluted because the start and end for single/double
		// quotes is the same, and can also be escaped

		while(next){

			if( next.type === start ){

				if( (prev && prev.type !== startEscape && start !== end) || !prev ){
					nstart++;
				} else if( start === end && prev.type !== startEscape ) {
					nend++;
				}
				
			} else if( next.type === end ){
				nend++;
				if(prev && prev.type === endEscape){ nend--; }
			}

			tks.push(next);
			
			if(nstart === nend) { break; }
			prev = next;
			next = this.tokens.pop();
			if(!next) { throw this.exceptionFactory(new Error(), 'UNMATCHED', curr); }
		}
		
		return tks.reverse();
	}

	,subParse: function(curr, modeToOpen, includeDelimsInSub){
		var  subTokens
			,closer
			,miniParse
			,parseOpts = vQuery.extend({}, this.options);
		
		parseOpts.initialMode = modeToOpen;
		
		subTokens = this.advanceUntilMatched(
			curr
			,curr.type
			,PAIRS[ curr.type ]
			,null
			,AT );
		
		subTokens.pop();
		
		closer = subTokens.shift();

		if( !includeDelimsInSub ){
			this.ast.push(curr);
		}

		miniParse = new VParser( subTokens, parseOpts );
		miniParse.parse();

		if( includeDelimsInSub ){
			// attach delimiters to [0] (first child), because ast is PROGRAM
			miniParse.ast[0].unshift( curr );
			miniParse.ast[0].push( closer );
		}

		this.ast.pushFlatten(miniParse.ast);

		if( !includeDelimsInSub ){
			this.ast.push(closer);
		}
	}

	,handleMKP: function(curr){
		var  next = this.tokens[ this.tokens.length - 1 ]
			,ahead = this.tokens[ this.tokens.length - 2 ]
			,tagName = null
			,opener;
		
		switch(curr.type){
			
			case AT_STAR_OPEN:
				this.advanceUntilMatched(curr, AT_STAR_OPEN, AT_STAR_CLOSE, AT, AT);
				break;
			
			case AT:
				if(next) { switch(next.type){
					
					case PAREN_OPEN:
					case IDENTIFIER:
					
						if(this.ast.length === 0) {
							this.ast = this.ast.parent;
							this.ast.pop(); // remove empty MKP block
						}

						this.ast = this.ast.beget( EXP );
						if(this.options.saveAT) this.ast.push( curr );
						break;
					
					case KEYWORD:
					case FUNCTION:
					case BRACE_OPEN:

						if(this.ast.length === 0) {
							this.ast = this.ast.parent;
							this.ast.pop(); // remove empty MKP block
						}

						this.ast = this.ast.beget( BLK );
						if(this.options.saveAT) this.ast.push( curr );
						break;
					
					default:
						if(this.options.saveAT) this.ast.push( curr );
						this.ast.push( this.tokens.pop() );
						break;
				} }
				break;
			
			case TEXT_TAG_OPEN:
			case HTML_TAG_OPEN:
				tagName = curr.val.match(/^<([^\/ >]+)/i);
				
				if(tagName === null && next && next.type === AT && ahead){
					tagName = ahead.val.match(/(.*)/); // HACK for <@exp>
				}

				if(this.ast.tagName){
					// current markup is already waiting for a close tag, make new child
					this.ast = this.ast.beget(MKP, tagName[1]);
				} else {
					this.ast.tagName = tagName[1];
				}

				if(HTML_TAG_OPEN === curr.type || this.options.saveTextTag) {
					this.ast.push(curr);
				}

				break;
			
			case TEXT_TAG_CLOSE:
			case HTML_TAG_CLOSE:
				tagName = curr.val.match(/^<\/([^>]+)/i);
				
				if(tagName === null && next && next.type === AT && ahead){
					tagName = ahead.val.match(/(.*)/); // HACK for </@exp>
				}
				
				opener = this.ast.closest( MKP, tagName[1] );
				
				if(opener === null || opener.tagName !== tagName[1]){
					// couldn't find opening tag
					// could mean this closer is within a child parser
					//throw this.exceptionFactory(new Error, 'UNMATCHED', curr);
				} else {
					this.ast = opener;
				}
				
				if(HTML_TAG_CLOSE === curr.type || this.options.saveTextTag) {
					this.ast.push( curr );
				}

				if(
					this.ast.parent && this.ast.parent.mode === BLK
					&& (next && (next.type === WHITESPACE || next.type === NEWLINE))
				){
					this.ast = this.ast.parent;
				}
				break;

			case HTML_TAG_SELFCLOSE:

				this.ast.push(curr);

				if(
					this.ast.parent && this.ast.parent.mode === BLK
					&& (next && (next.type === WHITESPACE || next.type === NEWLINE))
				){
					this.ast = this.ast.parent;
				}
				break;

			default:
				this.ast.push(curr);
				break;
		}
		
	}

	,handleBLK: function(curr){
		
		var  next = this.tokens[ this.tokens.length - 1 ]
			,submode
			,opener
			,closer
			,subTokens
			,parseOpts
			,miniParse
			,i;
		
		switch(curr.type){
			
			case AT:
				if(next.type !== AT){
					this.tokens.push(curr); // defer
					this.ast = this.ast.beget(MKP);
				}
				break;
			
			case AT_STAR_OPEN:
				this.advanceUntilMatched(curr, AT_STAR_OPEN, AT_STAR_CLOSE, AT, AT);
				break;

			case AT_COLON:
				this.subParse(curr, MKP, true);
				break;
			
			case TEXT_TAG_OPEN:
			case TEXT_TAG_CLOSE:
			case HTML_TAG_SELFCLOSE:
			case HTML_TAG_OPEN:
			case HTML_TAG_CLOSE:
				this.ast = this.ast.beget(MKP);
				this.tokens.push(curr); // defer
				break;
			
			//case FAT_ARROW:
			//	this.ast.push(curr)
			//	this.ast = this.ast.beget(BLK);
			//	break;

			case BRACE_OPEN:
			case PAREN_OPEN:
				submode = this.options.favorText && curr.type === BRACE_OPEN
					? MKP
					: BLK;
				
				this.subParse( curr, submode );
				
				subTokens = this.advanceUntilNot(WHITESPACE);
				next = this.tokens[ this.tokens.length - 1 ];

				if(
					next
					&& next.type !== KEYWORD
					&& next.type !== FUNCTION
					&& next.type !== BRACE_OPEN
					&& curr.type !== PAREN_OPEN
				){
					// defer whitespace
					this.tokens.push.apply(this.tokens, subTokens.reverse());
					this.ast = this.ast.parent;
				} else {
					this.ast.push(subTokens);
				}

				break;

			case WHITESPACE:
				this.ast.push(curr);
				this.advanceUntilNot(WHITESPACE);
				break;

			default:
				this.ast.push(curr);
				break;
		}
		
	}

	,handleEXP: function(curr){
		
		var ahead = null
			,opener
			,closer
			,parseOpts
			,miniParse
			,subTokens
			,prev
			,i;
		
		switch(curr.type){
			
			case KEYWORD:
			case FUNCTION:
				this.ast = this.ast.beget(BLK);
				this.tokens.push(curr); // defer
				break;
			
			case WHITESPACE:
			case LOGICAL:
			case ASSIGN_OPERATOR:
			case OPERATOR:
			case NUMERIC_CONTENT:
				if(this.ast.parent && this.ast.parent.mode === EXP){

					this.ast.push(curr);
				} else {

					// if not contained within a parent EXP, must be end of EXP
					this.ast = this.ast.parent;
					this.tokens.push(curr); // defer
				}

				break;

			case IDENTIFIER:
				this.ast.push(curr);
				break;
			
			case SINGLE_QUOTE:
			case DOUBLE_QUOTE:

				if(this.ast.parent && this.ast.parent.mode === EXP){
					subTokens = this.advanceUntilMatched(
						curr
						,curr.type
						,PAIRS[ curr.type ]
						,BACKSLASH
						,BACKSLASH );
					this.ast.pushFlatten(subTokens.reverse());

				} else {
					// probably end of expression
					this.ast = this.ast.parent;
					this.tokens.push(curr); // defer
				}

				break;

			case HARD_PAREN_OPEN:
			case PAREN_OPEN:

				prev = this.prevTokens[ this.prevTokens.length - 1 ];
				ahead = this.tokens[ this.tokens.length - 1 ];

				if( curr.type === HARD_PAREN_OPEN && ahead.type === HARD_PAREN_CLOSE ){
					// likely just [], which is not likely valid outside of EXP
					this.tokens.push(curr); // defer
					this.ast = this.ast.parent; //this.ast.beget(MKP);
					break;
				}

				this.subParse(curr, EXP);
				ahead = this.tokens[ this.tokens.length - 1 ];

				if( (prev && prev.type === AT) || (ahead && ahead.type === IDENTIFIER) ){
					// explicit expression is automatically ended
					this.ast = this.ast.parent;
				}

				break;
			
			case BRACE_OPEN:
				this.tokens.push(curr); // defer
				this.ast = this.ast.beget(BLK);
				break;

			case FAT_ARROW:
				this.tokens.push(curr); // defer
				this.ast = this.ast.beget(BLK);
				break;

			case PERIOD:
				ahead = this.tokens[ this.tokens.length - 1 ];
				if(
					ahead &&
					(  ahead.type === IDENTIFIER
					|| ahead.type === KEYWORD
					|| ahead.type === FUNCTION
					|| ahead.type === PERIOD )
				) {
					this.ast.push(curr);
				} else {
					this.ast = this.ast.parent;
					this.tokens.push(curr); // defer
				}
				break;
			
			default:

				if( this.ast.parent && this.ast.parent.mode !== EXP ){
					// assume end of expression
					this.ast = this.ast.parent;
					this.tokens.push(curr); // defer
				} else {
					this.ast.push(curr);
				}

				break;
		}
	}
}

/*jshint strict:false, asi:true, laxcomma:true, laxbreak:true, boss:true, curly:true, node:true, browser:true, devel:true */

function VCompiler(ast, originalMarkup){
	this.ast = ast;
	this.originalMarkup = originalMarkup || '';
}

var VCP = VCompiler.prototype;

VCP.assemble = function(options, helpers){

	options = options || {};
	helpers = helpers || {};
	

	var buffer = []
		,escapeStack = []

		,reQuote = /(["'])/gi
		,reEscapedQuote = /\\+(["'])/gi
		,reLineBreak = /[\n\r]/gi
		,joined
		,compiledFunc
		,linkedFunc
		
		,markupBuffer = [];

	function insertDebugVars(tok){
		if(options.debug){
			buffer.push(
				 options.helpersName + '.__vl = __vl = ' + tok.line + ', '
				,options.helpersName + '.__vc = __vc = ' + tok.chr + '; \n'
			);
		}
	}

	function visitMarkupTok(tok, parentNode, index){

		insertDebugVars(tok);
		buffer.push(
			"MKP('" + tok.val
				.replace(reQuote, '\\$1')
				.replace(reLineBreak, '\\n')
			+ "')MKP" );
	}

	function visitBlockTok(tok, parentNode, index){
		
		buffer.push( tok.val /*.replace(reQuote, '\"')*/ );
	}

	function visitExpressionTok(tok, parentNode, index, isHomogenous){

		var  start = ''
			,end = ''
			,parentParentIsNotEXP = parentNode.parent && parentNode.parent.mode !== EXP;

		if(options.htmlEscape !== false){

			if( parentParentIsNotEXP && index === 0 && isHomogenous ){
				start += options.helpersName + '.escape(';				
			}

			if( parentParentIsNotEXP && index === parentNode.length - 1 && isHomogenous){
				end += ").toHtmlString()";
			}
		}

		if(parentParentIsNotEXP && (index === 0 ) ){
			insertDebugVars(tok);
			start = "__vo.push(" + start;
		}

		if( parentParentIsNotEXP && index === parentNode.length - 1 ){
			end += "); \n";
		}

		buffer.push( start + tok.val /*.replace(reQuote, '"').replace(reEscapedQuote, '\\$1')*/ + end );		

		if(parentParentIsNotEXP && index === parentNode.length - 1){
			insertDebugVars(tok);
		}
	}

	function visitNode(node){

		var n, children = node.slice(0), nonExp, i, child;

		if(node.mode === EXP && (node.parent && node.parent.mode !== EXP)){
			// see if this node's children are all EXP
			nonExp = node.filter(findNonExp).length;
		}

		for(i = 0; i < children.length; i++){
			child = children[i];

			if(child.vquery){

				visitNode(child);
			
			} else if(node.mode === MKP){

				visitMarkupTok(child, node, i);

			} else if(node.mode === BLK){

				visitBlockTok(child, node, i);

			} else if(node.mode === EXP){
				
				visitExpressionTok(child, node, i, (nonExp > 0 ? false : true));

			}
		}

	}

	function findNonExp(node){

		if(node.vquery && node.mode === EXP){
			return node.filter(findNonExp).length > 0;
		}

		if(node.vquery && node.mode !== EXP){
			return true;
		} else {
			return false;
		}
	}

	// suprisingly: http://jsperf.com/array-index-vs-push
	buffer.push( options.helpersName + ' = ' + options.helpersName + ' || vash.helpers; \n');
	buffer.push( options.helpersName + '.__vo = ' + options.helpersName + '.__vo || []; \n');
	buffer.push('var __vo = ' + options.helpersName + '.__vo; \n');
	buffer.push( options.helpersName + '.model = ' + options.modelName + '; \n');

	if(options.debug){
		buffer.push(
			 'var __vl = ' + options.helpersName + '.__vl = 0,'
			,'__vc = ' + options.helpersName + '.__vc = 0; \n'
		);
	}
	
	visitNode(this.ast);

	if(options.useWith === true){
		buffer.unshift( "with(" + options.modelName + " || {}){ \n" );
		buffer.push("}");
	}

	if(options.debug){
		buffer.unshift( 'try { \n' );
		buffer.push( '} catch(e){ '
			,options.helpersName + '.reportError'
			,'(e, __vl, __vc, '
			,'"' + this.originalMarkup
				.replace(reLineBreak, '!LB!')
				.replace(reQuote, '\\$1')
				.replace(reEscapedQuote, '\\$1')
			+ '"'
			,') } \n' );
	}

	buffer.push( 'delete ' + options.helpersName + '.__vo; \n');

	if(options.debug){
		buffer.push( 'delete ' + options.helpersName + '.__vl \n' );
		buffer.push( 'delete ' + options.helpersName + '.__vc \n' );
	}

	buffer.push("return __vo.join(''); \n");

	joined = buffer.join('');

	// coalesce markup
	joined = joined
		.split("')MKPMKP('").join('')
		.split("MKP(").join("__vo.push(")
		.split(")MKP").join("); \n");

	if(options.debugCompiler){
		console.log(joined);
	}
	
	try {
		compiledFunc = new Function(options.modelName, options.helpersName, joined);			
	} catch(e){
		vash.helpers.reportError(e, 0, 0, joined, /\n/)
	}	

	// Link compiled function to helpers collection, but report original function
	// body for code generation purposes.
	linkedFunc = function(model) { return compiledFunc(model, helpers); };
	linkedFunc.toString = function() { return compiledFunc.toString(); };
	
	return linkedFunc;
}

	/************** End injected code from build script */	
	
	exports["VLexer"] = VLexer;
	exports["VParser"] = VParser;
	exports["VCompiler"] = VCompiler;
	exports["compile"] = function compile(markup, options){

		if(markup === '' || typeof markup !== 'string') {
			throw new Error('Empty or non-string cannot be compiled');
		}

		var  l
			,tok
			,tokens = []
			,p
			,c
			,cmp
			,i;

		options = vQuery.extend( {}, exports.config, options || {} );

		l = new VLexer(markup);
		while(tok = l.advance()) { tokens.push(tok); }
		tokens.reverse(); // parser needs in reverse order for faster popping vs shift

		p = new VParser(tokens, options);
		p.parse();

		c = new VCompiler(p.ast, markup);

		cmp = c.assemble(options, exports.helpers);
		cmp.displayName = 'render';
		return cmp;
	};

	return exports;
}({}));
