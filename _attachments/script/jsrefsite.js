/*******************************************************************************
 * Project JavaScript Reference Site (JS Ref Site)
 *
 * Started March, 2011
 *
 * By Stanley R. Silver and Peter de Croos
 *
 * http://javascripttoolbox.com/lib/contextmenu/
 *******************************************************************************/

/*******************************************************************************
 * Debugging
 *******************************************************************************/
function logNO(sName, o) {
    console.log('%s: %o', sName, o);
}
function log(s) {
    console.log(s);
}

/*******************************************************************************
 * Root
 *******************************************************************************/
var JsrRoot = PRoot.create({
    printString: function() {
        var ws = WriteStream.create();
        this.printOn(ws);
        return ws.contents();
    },
    __keys: function() {
        var keys = [];
        for (var k in this) {
            keys.push(k);
        }
        return keys;
    },
    log: function(sMessage) {
        //does method pass self to a function?
        sMessage = sMessage || '';
        var keys = this.__keys();
        var length = keys.length;
        var functionSourceString = arguments.callee.caller.toString();
        for (var i = 0; i < length; i++) {
            var key = keys[i];
            var valueAtKeyString = this[key].toString();
            if (functionSourceString === valueAtKeyString) {
                console.log('%o %s %s', this, key, sMessage);
                return this;
            }
        }
        console.log('%o %s %s', this, 'x', sMessage);
        return this;
    }
});

/*******************************************************************************
 * Constants
 *******************************************************************************/
var JsrConstant = JsrRoot.create({
    colorButton: 'green',
    colorButtonWelcome: 'magenta',
    colorButtonClean: 'cyan',
    colorButtonDirty: 'brown'

});

/*******************************************************************************
 * App
 *******************************************************************************/
var JsrApp = JsrRoot.create({
    ready: function() {
        $.contextMenu.theme = 'osx';
        JsrButtonManager.bindButtons();
        JsrTarText.initialize();
        this.setTitle();
    },
    addClassPrettyPrint: function() {
        //called after wiki page is generated
        // add prettyprint class to all <pre><code></code></pre> blocks
        $('pre code').parent().each(function() {
            $(this).addClass('prettyprint');
        });
        prettyPrint();
    },
    setTitle: function() {
        JsrCouchDb.readDatabaseInfo(function(jo) {
            $('title').text(jo.db_name + ' ' + location.hostname);
        });
    }
});

/*******************************************************************************
 * DOM Element Superclass
 *******************************************************************************/
var JsrElement = JsrRoot.create({
    _id: null,
    id: F.getSet('_id'),
    $: function() {
        return $(this.id());
    }
});

/*******************************************************************************
 * Buttons
 *******************************************************************************/
var JsrButtonManager = JsrRoot.create({
    //===========================
    // API
    //===========================
    bindButtons: function() {
        var _this = this;
        JsrCouchDb.readIds(function(asPageNames) {
            _this._buttons = [];
            _this._buttonData.forEach(function(each, i) {
                var id = '#btn' + (i + 1);
                var button = JsrButton.create(each);
                _this._buttons.push(button);
                button.bind(id, asPageNames);
            });
        });
    },
    resetButtons: function() {
        var _this = this;
        var interval = 1000;
        window.setTimeout(function() {
            //we know the couchdb docs have already changed
            //because this is called from the ajax callback
            //the delay allows the doc changes to propogate to the views
            JsrCouchDb.readIds(function(asPageNames) {
                _this._buttons.forEach(function(each) {
                    each.reset(asPageNames);
                });
            });
        }, interval);
    },

    //===========================
    // Data
    //===========================
    _buttonData: [
        {   text: 'FIRST TIME AT SITE',
            click: function(e) {
                JsrCouchDb.readText('WELCOME', function(sText) {
                    JsrTarText.setText(sText);
                })
            },
            color: JsrConstant.colorButtonWelcome
        },
        {   text: 'TODO',
            click:  function(e) {
                JsrCouchDb.readText('TODO', function(sText) {
                    JsrTarText.setText(sText);
                });
            }
        },
        {   text: 'LINKS',
            click: function(e) {
                JsrCouchDb.readText('LINKS', function(sText) {
                    JsrTarText.setText(sText);
                });
            }
        },
        {   text: 'Save Page',
            click: function(e) {
                JsrTarText.save(function() {
                    JsrButtonManager.resetButtons();
                });
            }
        },
        {   text: 'Read Page',
            menuFunction: function(asPageNames) {
                function generateItemFunction(sPageName) {
                    //generate a function bound to a specific page name
                    return function() {
                        JsrCouchDb.readText(sPageName, function(sText) {
                            JsrTarText.setText(sText);
                        });
                    };
                }
                var menuArray = [];
                asPageNames.forEach(function(each) {
                    var item = {};
                    item[each] = generateItemFunction(each);
                    menuArray.push(item);
                });
                menuArray.push({'Cancel': function() {}});
                var menu = $.contextMenu.create(menuArray, {});
                return menu;
            }
        },
        {   text: 'Delete Page',
            menuFunction: function(asPageNames) {
                function generateItemFunction(sPageName) {
                    //generate a function bound to a specific page name
                    return function() {
                        if (confirm('Delete page ' + sPageName + '?')) {
                            JsrCouchDb.deleteName(sPageName, function(oDocument) {
                                JsrButtonManager.resetButtons();
                            });
                        }
                    };
                }
                var menuArray = [];
                asPageNames.forEach(function(each) {
                    var item = {};
                    item[each] = generateItemFunction(each);
                    menuArray.push(item);
                });
                menuArray.push({'Cancel': function() {}});
                var menu = $.contextMenu.create(menuArray, {});
                return menu;
            }
        },
        {   text: 'Replicate Local To Remote',
            click: function(e) {
                JsrCouchDb
                .replicateFromTo('http://127.0.0.1:5984/jsref1', 'http://jsref:jsref0319@jsref.cloudant.com/jsref1');
            }
        },
        {   text: 'Replicate Remote To Local',
            click: function(e) {
                JsrCouchDb
                .replicateFromTo('http://jsref:jsref0319@jsref.cloudant.com/jsref1', 'http://127.0.0.1:5984/jsref1');
            }
        },
        {   text: 'Clear',
            click: function(e) {
                JsrTarText.clear();
                JsrTarText.$().focus();
            }
        },
        {   text: 'JavaScript Eval',
            click: function(e) {
                JsrEval.evaluateLines();
            }
        },
        {   text: 'JavaScript Print',
            click: function(e) {
                JsrEval.print();
            }
        },
        {   text: 'JavaScript String',
            menuFunction: function() {
                var menuArray = [
                    {'(Multiline String)': function(e) {
                    }},
                    {'To \\n': function(e) {
                        JsrEval.breakString();
                    }},
                    {'To \\n + cr': function(e) {
                        JsrEval.breakStringPlus();
                    }},
                    {'To array of lines': function(e) {
                        JsrEval.arrayOfLines();
                    }},
                    $.contextMenu.separator,
                    {'Select Main Lines': function(e) {
                        JsrEval.mainLines();
                    }}
                ];
                var menu = $.contextMenu.create(menuArray, {});
                return menu;
            }
        },
        {   text: 'Markdown',
            click: function(e) {
                JsrTarText.toMarkdown();
            }
        },
        {   text: 'Google Wiki',
            click: function(e) {
                JsrTarText.toGoogleWiki();
            }
        },
        {   text: 'Text',
            click: function(e) {
                JsrTarText.toText();
            }
        },
        {   text: 'Show HTML',
            menuFunction: function(asPageNames) {
                function generateItemFunction(sPageName) {
                    //generate a function bound to a specific page name
                    return function() {
                        JsrCouchDb.readHtml(sPageName, function(sHtml) {
                            alert(sHtml);
                            $('#divTar').html(sHtml);
                            JsrApp.addClassPrettyPrint();
                        });
                    };
                }
                var menuArray = [];
                asPageNames.forEach(function(each) {
                    var item = {};
                    item[each] = generateItemFunction(each);
                    menuArray.push(item);
                });
                menuArray.push({'Cancel': function() {}});
                var menu = $.contextMenu.create(menuArray, {});
                return menu;
            }

        },
        {   text: 'Show Text',
            menuFunction: function(asPageNames) {
                function generateItemFunction(sPageName) {
                    //generate a function bound to a specific page name
                    return function() {
                        JsrCouchDb.readHtml(sPageName, function(sHtml) {
                            JsrTarText.setText(sHtml);
                        });
                    };
                }
                var menuArray = [];
                asPageNames.forEach(function(each) {
                    var item = {};
                    item[each] = generateItemFunction(each);
                    menuArray.push(item);
                });
                menuArray.push({'Cancel': function() {}});
                var menu = $.contextMenu.create(menuArray, {});
                return menu;
            }

        },
        {   text: 'TEST',
            click: function(e) {
                JsrTarText.setValue(JsrTarText.getData());
            }
        }
    ]
});
var JsrButton = JsrElement.create({
    //buttons are instantiated on a data object,
    //from which they gain a text: property and either
    //a click: property or a menuFuntion: property,
    //and someties a color: property

    //===========================
    // default data (can be overwritten)
    //===========================
    color: JsrConstant.colorButtonClean,

    //===========================
    // methods
    //===========================
    bind: function(sId, asPageNames) {
        this.id(sId);
        var $this = this.$();
        $this.text(this.text);
        $this.css('background-color', this.color);
        if (this.click) {
            $this.click(this.click);
        }
        if (this.menuFunction) {
            var menu = this.menuFunction(asPageNames);
            $this.click(function(e) {
                menu.show(this, e);
                return false;
            });
        }
        return this;
    },
    reset: function(asPageNames) {
        if (this.menuFunction) {
            var menu = this.menuFunction(asPageNames);
            this.$().unbind('click').click(function(e) {
                menu.show(this, e);
                return false;
            });
        }

    }
});

/*******************************************************************************
 * Couch
 *******************************************************************************/
var JsrCouchDb = JsrRoot.create({
    _errorCallback: function (oXmlHttpRequest, sStatus, oError) {
        $.jGrowl("Ooooops!, request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
        .responseText, {life: 100000});
    },
    _systemPrefix: '../../../',
    _databasePrefix: '../../',
    _appPrefix: '',
    replicateFromTo: function(sSourceUrl, sTargetUrl) {
        $.ajax({
            type: 'post',
            url: this._systemPrefix + '_replicate',
            data: JSON.stringify({
                'source': sSourceUrl,
                'target': sTargetUrl
            }),
            contentType: 'application/json',
            success:    function(sDocument) {
                $.jGrowl('From ' + sSourceUrl + ' to ' + sTargetUrl, {header: "Replicated"});
            },
            error: this._errorCallback
        });
    },
    readIds: function(fCallback) {
        $.ajax({
            type: 'get',
            url: this._appPrefix + '_view/page-ids',
            success: function(sDocument) {
                var jsonObject = JSON.parse(sDocument);
                logNO('readIds document', jsonObject);
                var array = jsonObject.rows;
                var ids = array.map(function(each) {
                    return each.key;
                });
                fCallback(ids);
            },
            error: this._errorCallback
        });
    },
    readDatabaseInfo: function(fCallback) {
        $.ajax({
            type: 'get',
            url: this._databasePrefix,
            success: function(sDocument) {
                var jsonObject = JSON.parse(sDocument);
                fCallback(jsonObject);
            },
            error: this._errorCallback
        });
    },
    readHtml: function(sName, fCallback) {
        $.ajax({
            type: 'get',
            url: this._appPrefix + '_show/textToHtml/' + sName,
            success: fCallback,
            error: this._errorCallback
        });
    },
    readText: function(sName, fCallback) {
        $.ajax({
            type:    'get',
            url:    this._databasePrefix + sName,
            success: function(sDocument) {
                var jsonObject = JSON.parse(sDocument);
                var text = jsonObject.text;
                fCallback(text);
            },
            error: this._errorCallback
        });
    },
    saveText: function(sName, sText, fCallback) {
        fCallback = fCallback || null;
        var data = {
            text: sText,
            type: 'page'
        };
        this.saveData(sName, data, fCallback);
    },
    saveData: function(sName, oData, fCallback) {
        // get existing object first (so will have correct _rev) or create new object
        fCallback = fCallback || null;
        var couchDocument;
        var _this = this;
        $.ajax({
            type: 'get',
            url: this._databasePrefix + sName,
            success: function(sDocument) {
                //jsonObject exists  (a normal occurance)
                couchDocument = JSON.parse(sDocument);
                $.extend(couchDocument, oData);
                _this.saveCouchDocument(couchDocument, fCallback);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                //jsonObject does not exist (a normal occurance)
                couchDocument = {
                    _id: sName
                };
                $.extend(couchDocument, oData);
                _this.saveCouchDocument(couchDocument, fCallback);
            }
        });
    },
    saveCouchDocument: function(oDocument, fCallback) {
        //assume correct _id and correct _rev
        logNO('fCallback', fCallback);
        $.ajax({
            type:    'put',
            url:    this._databasePrefix + oDocument._id,
            data:    JSON.stringify(oDocument),
            success:    function(sDocument) {
                var jsonObject = JSON.parse(sDocument);
                if (fCallback) {
                    fCallback(jsonObject);
                }
                $.jGrowl("Your page has been saved with id " + jsonObject.id, {header: "Saved"});
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                $.jGrowl("Ooooops!, save request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
            }
        });
    },
    deleteName: function(sName, fCallback) {
        // get existing object (so will have correct _rev)
        fCallback = fCallback || null;
        var jsonObject;
        var _this = this;
        $.ajax({
            type: 'get',
            url: this._databasePrefix + sName,
            success: function(sDocument) {
                jsonObject = JSON.parse(sDocument);
                _this.deleteDocument(jsonObject, fCallback);
            },
            error: this._errorCallback
        });
    },
    deleteDocument: function(oDocument, fCallback) {
        //assume correct _id and correct _rev
        $.ajax({
            type:    'delete',
            url:    this._databasePrefix + oDocument._id + '?rev=' + oDocument._rev,
            success:    function(sDocument) {
                var jsonObject = JSON.parse(sDocument);
                if (fCallback) {
                    fCallback(jsonObject);
                }
                $.jGrowl("Page has been deleted with id " + jsonObject.id, {header: "Deleted"});
            },
            error: this._errorCallback
        });
    }
});

/*******************************************************************************
 * Eval
 *******************************************************************************/
var JsrEval = JsrRoot.create({
    shouldTest: true,
    //====
    // API
    //====
    evaluateLines: function () {
        var text = JsrTarText.getText();
        var result = this._evaluateLines(text);
        JsrTarText.setText(result);
        return this;
    },
    print: function () {
        var text = JsrTarText.getText();
        var result = this._print(text);
        JsrTarText.setText(result);
        return this;
    },
    breakString: function () {
        var text = JsrTarText.getText();
        var result = this.replaceCr(text, '\\n');
        JsrTarText.setText(result);
        return this;
    },
    breakStringPlus: function () {
        var text = JsrTarText.getText();
        var result = this.replaceCr(text, "\\n' +\n'");
        JsrTarText.setText(result);
        return this;
    },
    arrayOfLines: function() {
        var text = JsrTarText.getText();
        var result = this._arrayOfLines(text);
        JsrTarText.setText(result);
        return this;
    },
    mainLines: function () {
        var text = JsrTarText.getText();
        var result = this._mainLines(text);
        JsrTarText.setText(result);
        return this;
    },
    //===============
    // Evaluate Lines
    //===============
    spaceString: function (i) {
        var result = '';
        while (result.length < i) {
            result += ' ';
        }
        return result;
    },
    upToResult: function(sLine) {
        var index = sLine.search(/\/\/=>/);
        return (index > -1) ? sLine.slice(0, index) : sLine;
    },
    _evaluateLines: function (sLines) {
        var _this = this, max = 0, code = '', display = '';
        var lines = sLines.split('\n').map(function(each) {
            return _this.upToResult(each).trimRight();
        });
        lines = lines.filter(function(each) {
            return each.length > 0;
        });
        lines.forEach(function(each) {
            max = Math.max(max, each.length);
        });
        lines.forEach(function(each, i) {
            var pad = max + 2 - each.length;
            code += each + '\n';
            if (i > 0) {
                display += '\n';
            }
            display += each;
            try {
                var result = eval(code);
                if (result !== undefined) {
                    display += _this.spaceString(pad) + '//=> ' + result;
                }
            } catch (e) {
            }
        });
        return display;
    },
    //===========================
    // Print
    //===========================
    _print: function(sCode) {
        var javascriptObject = eval(sCode);
        var printString = PrintVisitor.create().visit(javascriptObject);
        return printString;
    },

    //===========================
    // Multiline String
    //===========================
    replaceCr: function (s, sReplacement) {
        var result = s.replace(/\n/g, sReplacement);
        result = "'" + result + "'";
        return result;
    },
    _arrayOfLines: function(s) {
        var lines = s.split('\n');
        var result = '[';
        lines.forEach(function(each, i) {
            if (i !== 0) {
                result += ",";
            }
            result += "\n    '" + each + "'"
        });
        result += '\n]';
        return result;
    },
    //===========================
    // Main Lines
    //===========================
    whitePrefixLength: function(s) {
        var match = s.match(/^(\s*)/);
        if (match === null) {
            return 0
        }
        return match[1].length;
    },
    minWhitePrefixLength: function(s) {
        var lines = s.split('\n');
        var min = 9999;
        var _this = this;
        $.each(lines, function(i, each) {
            var length = _this.whitePrefixLength(each);
            if (length < min) {
                min = length;
            }
        });
        return min;
    },
    _mainLines: function (sLines) {
        var length = this.minWhitePrefixLength(sLines);
        var lines = sLines.split('\n');
        var trimmed = lines.map(function(each) {
            return each.slice(length);
        });
        var notSpaceStart = /^\S/;
        var noSpace = trimmed.filter(function(each) {
            return notSpaceStart.test(each);
        });
        var alphaStart = /^\w/;
        var alpha = noSpace.filter(function(each) {
            return alphaStart.test(each);
        });
        var result = alpha.join('\n');
        return result;
    }
});

/*******************************************************************************
 * Textarea
 *******************************************************************************/
var JsrTextArea = JsrElement.create({
    shouldTest: true,
    //=======================
    // to and from textarea
    //=======================
    getText: function() {
        return $(this.id()).val();
    },
    setText: function(s) {
        $(this.id()).val(s);
        return this;
    },
    setLines: function(as) {
        var text = '';
        as.forEach(function(each, i) {
            if (i > 0) {
                text += '\n';
            }
            text += each;
        })
        this.setText(text);
    },
    insertText: function(s) {
        var text = this.getText();
        var newText;
        var $this = $(this.id());
        var startSelection = $this.attr('selectionStart');
        var endSelection = $this.attr('selectionEnd');

        if (startSelection || startSelection === 0) {
            var before = text.substring(0, startSelection);
            var after = text.substring(endSelection, text.length);
            newText = before + s + after;
            this.setText(newText);
            this.selectText(startSelection, startSelection + s.length);
        } else {
            this.setText(text + s);
            this.selectText(text.length, text.length + s.length);
        }
    },
    selection: function() {
        return {
            start: $(this.id()).attr('selectionStart'),
            end: $(this.id()).attr('selectionEnd')
        };
    },
    selectText: function(iFrom, iTo) {
        iTo = iTo || iFrom;
        $(this.id()).attr('selectionStart', iFrom);
        $(this.id()).attr('selectionEnd', iTo);
    },
    setValue: function(v) {
        var visitor = PrintVisitor.create();
        var string = visitor.visit(v);
        return this.setText(string);
    },
    setValueInspect: function(v, iMaxCount) {
        var visitor = PrintVisitor.create({
            _maxCount: iMaxCount,
            _revisit: true,
            _indexAll: true
        });
        var string = visitor.visit(v);
        return this.setText(string);
    },
    clear: function() {
        return this.setText('');
    },
    //=======================
    // print
    //=======================
    printText: function() {
        this.openText(this.getText());
    },
    openText: function(sText) {
        var html = '<textarea rows=50 cols=80>' + sText + '</textarea>';
        this.openHtml(html);
    },
    openHtml: function(sHtml) {
        var printWindow = window.open("", "printpop", "location=0,status=0,scrollbars=0,width=700,height=750");
        $(printWindow.document.body).html(sHtml);
        return this;
    },
    //=======================
    // insert
    //=======================
    insertDate: function() {
        this.selectText(0);
        var date = BrwUtility.dateStringHuman();
        var ws = WriteStream.create();
        ws.line(date.length).cr().s(date).cr().line(date.length).cr();
        var dateLines = ws.contents();
        this.insertText(dateLines);
        this.selectText(dateLines.length);
    },
    insertComment: function(sComment) {
        sComment = sComment || 'xxx';
        var selectionStart = this.selection().start;
        var ws = WriteStream.create();
        ws.line(78).cr().s(sComment).cr().line(78).cr();
        var commentLines = ws.contents();
        this.insertText(commentLines);
        var start = selectionStart + 79;
        var end = start + sComment.length;
        this.selectText(start, end);
    },
    //=======================
    // bind key events
    //=======================
    bindKeyEvents: function() {
        var _this = this;
        this.$().keydown(function(e) {
            //_this.isDirty();
            //metaKey, ctrlKey, shiftKey, altKey
            if (e.metaKey) {
                var charCode = e.which;
                var letter = String.fromCharCode(charCode);
                if (letter === 's' || letter === 'S') {
                    _this.save();
                    //I don't fully understand stopping the event
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
            //Does not stop the event
            return true;
        });
    },
    //=======================
    // initialize
    //=======================
    initialize: function() {
        this.bindKeyEvents();
        this.$().tabby();
    }
});
var JsrTarText = JsrTextArea.create({
    _id: '#tarText',
    _text: null,

    //=======================
    // storage
    //=======================
    save: function(fCallback) {
        fCallback = fCallback || null;
        JsrCouchDb.saveData(this.getName(), this.getData(), fCallback);
    },
    read: function(sName) {
        var _this = this;
        JsrCouchDb.readText(sName, function(sText) {
            _this.setText(sText);
        });
    },

    //=======================
    // name
    //=======================
    firstLine: function(s) {
        var lines = s.split('\n');
        var first = lines[0];
        return first;
    },
    spaceToUnderscore: function(s) {
        return s.replace(/ /g, '_');
    },
    getName: function() {
        return this.spaceToUnderscore(this.firstLine(this.getText()));
        return this;
    },

    //=======================
    // data
    //=======================
    /*****
     LINKS
     ====================
     type/page
     cat/javascript/reference/links
     cat/couchdb/reference/links
     button
     ====================

     next
     *****/

    getData: function() {
        var text = this.getText();
        var data = this.textToData(text);
        data.text = text;
        return data;
    },
    textToData: function(sText) {
        var header = sText.split(/\n\n/)[0];
        var lines = header.split(/\n/);
        var noName = lines.slice(1);
        var noDividers = noName.filter(function(each) {
            //true if line does not start with ===
            return !/^===/.test(each);
        });
        return this.linesToData(noDividers);
    },
    linesToData: function(aLines) {
        //default type = page
        var data = {wiki: true, type: 'page'};
        aLines.forEach(function(each) {
            var split = each.split('/');
            var key = split[0];
            if (split.length === 1) {
                data[key] = true;
            } else if (split.length === 2) {
                data[key] = split[1];
            } else {
                var existing = data[key];
                if (existing) {
                    existing.push(each)
                } else {
                    data[key] = [each]
                }
            }
        });
        return data;
    },

    //=======================
    // Wiki
    //=======================
    toMarkdown: function() {
        var text = this.getText();
        this._text = text;
        var html = markdown.toHTML(text);
        $('#divTar').html(html);
        JsrApp.addClassPrettyPrint();
        return this;
    },
    toGoogleWiki: function() {
        var text = this.getText();
        this._text = text;
        var parser = new GoogleCodeWikiParser();
        var html = parser.parse(text);
        $('#divTar').html(html);
        //pretty print is already in wiki
        return this;
    },
    toText: function() {
        $('#divTar').html('<textarea id="tarText" class="tar border"></textarea>');
        this.initialize();
        this.setText(this._text);
        return this;
    },

    //=======================
    // replace
    //=======================
    replaceWith: function(sElement) {
        this.$().replaceWith(sElement);
        return this;
    }
});
/*******************************************************************************
 * Window Holder
 *******************************************************************************/
var JsrWindowHolder = JsrRoot.create({
    _windows: null,
    windows: F.getSetArray('_windows'),
    closeWindows: function() {
        while (this.windows().length > 0) {
            this.windows().pop().close();
        }
    },
    open: function () {
        this.closeWindows();
        var urls = this.urls();
        this.openUrls(urls);
        return this;
    },
    openUrls: function(aUrls) {
        _this = this;
        aUrls.forEach(function(each) {
            _this.openUrl(each);
        });
    },
    openUrl: function(sUrl) {
        this.windows().push(window.open(sUrl));
    }
});
var JsrSearch = DfWindowHolder.create({
    urls: function() {
        var searchInput = DfInput.getText();
        var terms = searchInput.split(' ').join('+');
        var knowt = DfApp.kb().withTitle('SearchUrls');
        var bases = knowt._result;
        var urls = $.map(bases, function(each) {
            return each + terms;
        })
        return urls;
    }
});
var JsrUnitTests = DfWindowHolder.create({
    urls: function() {
        var result = this.urlsFromTitle('UnitTestUrls');
        return result;
    }
});
var JsrJsTools = DfWindowHolder.create({
    urls: function () {
        var result = this.urlsFromTitle('JsToolUrls');
        return result;
    }
});
var JsrKbLink = DfWindowHolder.create({
    urls: function () {
        var result = this.urlsFromTitle('KbLink');
        return result;
    }
});