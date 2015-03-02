var editor = window.CodeMirror.fromTextArea(document.getElementById("editor"), {
	lineNumbers: true,
	scrollbarStyle: "overlay",
	matchBrackets: true,
	mode: 'text/x-php',
	indentUnit: 2,
	tabSize: 3,
	autofocus: true,
	autoCloseBrackets: true,
	theme: 'monokai'
});

function processCode () {
	var err = el.cl('error-gutter'); if(err) err.classList.remove('error-gutter');
	XHR({
		url: '/src/eval/index.php',
		method: 'POST',
		data: {code: getNicerValue()},
		onload: processResponse,
		onerror: processFatalError
	});
}

function getNicerValue () {
	// it will wrap lastLine in var_dump if it startsWith `>` followed by any space
	// AND does not end with a semicolon
	var actualValue = window.editor.getValue(),
		lastLine = window.editor.getLine(window.editor.lastLine()).trim();
	
	if (lastLine.startsWith('>') && !lastLine.endsWith(';')) {
		// let us add var_dump!
		var	lines = actualValue.split('\n'),
			newLastLine = lastLine.replace(/^> */, 'var_dump(') + ');';
		
		lines[lines.length - 1] = newLastLine;
		return lines.join('\n');
	}

	return actualValue;
}

var editorHelpers = {
	getPrettyFatalErrorMessage: function(error) {
		return ['Line ' + error.line + ': ' + error.message, error.line];
	},
	showLineError: function(line) {
		// Find the dom element in the gutter
		var lineElement = ([].filter.call(els.cl('CodeMirror-linenumber CodeMirror-gutter-elt'), function (node) {
			return Number(node.textContent) === line;
		}))[0];
		lineElement.classList.add('error-gutter');
	},
	setOutput: function(text) {
		var isError = !!arguments[1],
			output = el('.output span');

		// Remove error classes if any
		output.innerHTML = text;
		output.classList.remove('error');

		if (isError) output.classList.add('error');

		// Turn off the spinner
		// el.remove(el.cl('spinner'));
		// Set the timestamp
		// var time = new Date;
		// $('.timestamp').find('span').html(time);
	}
};

function processResponse(res) {
	if (!res) return;

	var result = res.result,
		error = res.error,
		errorMsg = '';

	if (!error) {
		editorHelpers.setOutput(result);
	}
	else {
		if (error.line && error.message) {
			// Show the line in red
			editorHelpers.showLineError(error.line);

			// Show the error message
			errorMsg = 'Line ' + error.line + ': ';
		}

		errorMsg += error.message;

		editorHelpers.setOutput(errorMsg, true);
	}
}

function processFatalError(resp) {
	if (!resp) return;

	var textLine = editorHelpers.getPrettyFatalErrorMessage(resp.error);

	editorHelpers.setOutput(textLine[0], true);
	editorHelpers.showLineError(textLine[1]);
}

function checkForShortcuts(e) {
	// CMD + Enter or CTRL + Enter to run code
	if (e.which === 13 && (e.ctrlKey || e.metaKey)) {
		processCode();
		e.preventDefault();
	}

	// // CMD + S or CTRL + S to save code
	// if (e.which === 83 && (e.ctrlKey || e.metaKey)) {
	// 	storageHelpers.saveCode();
	// 	e.preventDefault();
	// }
}

window.addEventListener('keydown', checkForShortcuts);

el.id('info-btn').addEventListener('click', function () {
	this.textContent = (this.textContent === '?') ? '✕' : '?';
	el.cl('footer').classList.toggle('hidden');
});

/****SNIPPETS!!!! MUHAHAHAHAHAHAHA****/

var Snip = {};
Snip.UI = {};
Snip.DB = new Store('Snippets');

if (!Snip.DB.contains('snips') || !Snip.DB.get('snips').length) {
	Snip.DB.add('snips', [{
		name: 'Snippet #0',
		code: 'echo \'foo bar\'',
		created: new Date()
	}]);
	Snip.DB.add('config', Snip.DB.get('config') || {});
	Snip.DB.add('lastActive', 0);
	Snip.DB.add('count', 1);
}

Snip.create = function (code) {
	var snip = {
		name: 'Snippet #' + Snip.DB.store.count++,
		code: code,
		created: new Date()
	};
	Snip.DB.store.snips.push(snip);
	Snip.DB.save();
	return snip;
};

Snip.rename = function () {
	var newName = this.textContent.trim(),
		index = Number(this.dataset.snipindex);
	Snip.DB.store.snips[index].name = newName;
	Snip.DB.save();
	this.contentEditable = false;
	this.classList.remove('editing');
	Snip.UI.listing(index).textContent = newName;
};

Snip.save = function (index, code) {
	Snip.DB.store.snips[index].code = code;
	Snip.DB.save();
};

Snip.getSnip = function (index) {
	return Snip.DB.store.snips[index];
};

Snip.markToRemove = function (index) {
	this.DB.store.snips[index].removeAtUnload = true;
	this.DB.save();
	if (Number(this.UI.currSnip.dataset.snipindex) === index) {
		window.editor.setValue('');
		this.UI.currSnip.textContent = 'Select snippet to open!';
		this.DB.store.lastActive = null;
	}
};

Snip.remove = function (index) {
	this.DB.store.snips.splice(index, 1);
	this.DB.save();
};

Snip.UI.init = function () {
	this.createUI();
	Snip.DB.get('snips').forEach(this.list.bind(Snip.UI));
	this.open(Snip.DB.get('lastActive'), 'fresh');
};
Snip.UI.open = function (index, fresh) {
	if (index === null) return;
	if (!fresh) Snip.save(Snip.DB.get('lastActive'), window.editor.getValue());
	var snip = Snip.DB.store.snips[index];
	this.currSnip.textContent = snip.name;
	this.currSnip.dataset.snipindex = index;
	window.editor.setValue(snip.code);
	Snip.DB.add('lastActive', index);
	if (this.active) this.active.classList.remove('active');
	this.active = this.listing(index);
	this.active.classList.add('active');
};
Snip.UI.list = function (snip, index) {
	if (this.listing(index)) return;
	var snipEl = el.make('li', {});
	el.add(el.make('a', {
		href: '#',
		textContent: snip.name,
		title: 'Created on: ' + snip.created,
		dataset: {snipindex: index},
		className: 'snippet-link'
	}), snipEl);
	el.add(el.make('a', {
		className: 'delete-btn',
		textContent: '✕',
		href: '#'
	}), snipEl);
	el.add(snipEl, this.snipList);
};
Snip.UI.listing = function (index) {
	// get the li element which represents the snip for given index
	return el('[data-snipindex="' + index + '"]', this.snipList);
	// I know I should not use dynamic css selectors without escaping
	// or better not use dynamic css selectors at all
	// but fuck you
};
Snip.UI.createUI = function () {
	this.currSnip = el.cl('current-snippet');
	this.currSnip.addEventListener('dblclick', this.letUserRename);
	this.currSnip.addEventListener('blur', Snip.rename);
	this.currSnip.addEventListener('keydown', function (e) {
		if (e.keyCode === 13) {
			Snip.rename.bind(this);
			e.preventDefault();
		}
	});
	this.snipList = el.cl('snippet-list');
	this.snipList.addEventListener('click', function (e) {
		if (e.target.classList.contains('delete-btn')) {
			var link = e.target.previousElementSibling;
			Snip.markToRemove(Number(link.dataset.snipindex));
			return link.parentNode.classList.add('hidden');
		}
		try {
			Snip.UI.open(Number(e.target.dataset.snipindex));
		}
		catch (e) {}
	});
	el.id('new-snip-btn').addEventListener('click', function () {
		var snip = Snip.create('/* enter some code here! */'),
			index = Snip.DB.get('count')-1;
		Snip.UI.list(snip, index);
		Snip.UI.open(index);
	});
	el.id('snip-search').addEventListener('keyup', function () {
		[].forEach.call(els.tag('li', Snip.UI.snipList), function (li) {
			if (!this.value.length) return li.classList.remove('hidden');
			if (li.textContent.trim().toLowerCase().indexOf(this.value) !== -1) {
				li.classList.add('hidden');
			}
			else {
				li.classList.remove('hidden');
			}
		}, this);
	});
};

Snip.UI.letUserRename = function (e) {
	this.contentEditable = true;
	this.classList.add('editing');
};
window.addEventListener('load', Snip.UI.init.bind(Snip.UI));
window.addEventListener('beforeunload', function () {
	Snip.save(Number(Snip.UI.currSnip.dataset.snipindex), window.editor.getValue());
	Snip.DB.store.snips.forEach(function (snip, index) {
		if (snip.removeAtUnload) Snip.remove(index);
	});
});
