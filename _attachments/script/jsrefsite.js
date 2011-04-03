/*******************************************************************************
 * Project JavaScript Reference Site (JS Ref Site)
 *
 * Started March, 2011
 *
 * By Stanley R. Silver and Peter de Croos
 *
 * http://javascripttoolbox.com/lib/contextmenu/
 *******************************************************************************/
//todo string methods to buttons
//todo start wiki design

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
var JsrConstant = JsrRoot.create({
    colorButton: 'green',
    colorButtonWelcome: 'magenta',
    colorButtonClean: 'cyan',
    colorButtonDirty: 'brown'

});
var JsrApp = JsrRoot.create({
    ready: function() {
        $('.tar').tabby();
        JsrButtonManager.bindButtons();
        JsrTarText.bindKeyEvents();
    }
});
var JsrButtonManager = JsrRoot.create({
    button: function(nId, sText, fClick) {
        var $button = $('#btn' + nId);
        $button.text(sText).click(fClick);
        $button.css('background-color', JsrConstant.colorButtonClean);
        return this;
    },
    bindButtons: function() {
        var id = 1;
        this.button(id++, 'FIRST TIME AT SITE', function(e) {
            JsrCouchDb.readNameText('WELCOME', function(sText) {
                JsrTarText.setText(sText);
            });
        });
        this.button(id++, 'Save Page', function(e) {
            JsrTarText.save(function() {
                log(11);
                JsrReadButton.resetMenu();
                JsrDeleteButton.resetMenu();
            });
        });
        JsrReadButton.id('#btn' + id++).setMenu().colorClean();
        JsrDeleteButton.id('#btn' + id++).setMenu().colorClean();
        this.button(id++, 'Clear', function(e) {
            JsrTarText.clear();
        });
        this.button(id++, 'JavaScript Eval', function(e) {
            JsrEval.evaluateLines();
        });
        this.button(id++, 'JavaScript Print', function(e) {
            JsrEval.print();
        });
        JsrStringButton.id('#btn' + id++).setMenu().colorClean();
        this.button(id++, 'Creole', function(e) {
            JsrTarText.toCreole();
        });
        this.button(id++, 'Text', function(e) {
            JsrTarText.toText();
        });

        $('#btn1').css('background-color', JsrConstant.colorButtonWelcome);
        return this;
    }
});
var JsrButton = JsrRoot.create({
    _id: null,
    id: function(sId) {
        if (sId) {
            this._id = sId;
            return this;
        } else {
            return this._id;
        }
    },
    colorClean: function() {
        $(this._id).css('background-color', JsrConstant.colorButtonClean);
    },
    colorDirty: function() {
        $(this._id).css('background-color', JsrConstant.colorButtonDirty);
    },
    resetMenu: function() {
        var _this = this;
        JsrCouchDb.readIds(function(aIds) {
            var menuArray = [];
            aIds.forEach(function(each) {
                var item = {};
                var callback = _this.generateMenuCallback(each);
                item[each] = callback;
                menuArray.push(item);
            });
            menuArray.push({'Cancel': function() {}});
            var menu = $.contextMenu.create(menuArray, {});
            $(_this._id).unbind('click').click(function(e) {
                menu.show(this, e);
                return false;
            });
        });
        return this;
    },
    setMenu: function() {
        $.contextMenu.theme = 'osx';
        $(this._id).text(this.name());
        this.resetMenu();
        return this;
    }
});
var JsrStringButton = JsrButton.create({
    name: function() {
        return 'JavaScript String';
    },
    resetMenu: function() {
        var menuArray = [
            {'cr to \\n': function(e) {
                JsrEval.breakString();
            }},
            {'cr to \\n + cr': function(e) {
                JsrEval.breakStringPlus();
            }},
            {'array of lines': function(e) {
                JsrEval.arrayOfLines();
            }},
            {'main lines': function(e) {
                JsrEval.mainLines();
            }}
        ];
        var menu = $.contextMenu.create(menuArray, {});
        $(this._id).unbind('click').click(function(e) {
            menu.show(this, e);
            return false;
        });
        return this;
    }
});
var JsrReadButton = JsrButton.create({
    name: function() {
        return 'Read Page';
    },
    generateMenuCallback: function(sName) {
        return function() {
            JsrCouchDb.readNameText(sName, function(sText) {
                JsrTarText.setText(sText);
            });
        };
    }
});
var JsrDeleteButton = JsrButton.create({
    name: function() {
        return 'Delete Page';
    },
    generateMenuCallback: function(sName) {
        return function() {
            if (confirm('Delete page ' + sName + '?')) {
                JsrCouchDb.deleteName(sName, function(oDocument) {
                    JsrReadButton.resetMenu();
                    JsrDeleteButton.resetMenu();
                });
            }
        };
    }
});

/*******************************************************************************
 * Couch
 *******************************************************************************/
var JsrCouchDb = JsrRoot.create({
    readIds: function(fCallback) {
        $.ajax({
            type: 'get',
            url: '_view/page-ids',
            success: function(sDocument) {
                var document = JSON.parse(sDocument);
                logNO('readIds document', document);
                var array = document.rows;
                var ids = array.map(function(each) {
                    return each.key;
                });
                fCallback(ids);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                $.jGrowl("Ooooops!, save request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
            }
        });
    },
    saveDocument: function(oDocument, fCallback) {
        //assume correct _id and correct _rev
        logNO('fCallback', fCallback);
        $.ajax({
            type:    'put',
            url:    '../../' + oDocument._id,
            data:    JSON.stringify(oDocument),
            async:    false,
            success:    function(sDocument) {
                var document = JSON.parse(sDocument);
                if (fCallback) {
                    fCallback(document);
                }
                $.jGrowl("Your page has been saved with id " + document.id, {header: "Saved"});
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                $.jGrowl("Ooooops!, save request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
            }
        });
    },
    saveNameText: function(sName, sText, fCallback) {
        // get existing object (so will have correct _rev) or create new object
        fCallback = fCallback || null;
        var document;
        var _this = this;
        $.ajax({
            type: 'get',
            url: '../../' + sName + "?revs=true",
            success: function(sDocument) {
                document = JSON.parse(sDocument);
                document.text = sText;
                document.type = 'page';
                _this.saveDocument(document, fCallback);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                document = {
                    _id: sName
                };
                document.text = sText;
                document.type = 'page';
                _this.saveDocument(document, fCallback);
            }
        });
    },
    readNameText: function(sName, fCallback) {
        $.ajax({
            type:    'get',
            url:    '../../' + sName + "?revs=true",
            success: function(sDocument) {
                var document = JSON.parse(sDocument);
                var text = document.text;
                fCallback(text);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                $.jGrowl("Ooooops!, request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
            }
        });
    },
    deleteDocument: function(oDocument, fCallback) {
        //assume correct _id and correct _rev
        $.ajax({
            type:    'delete',
            url:    '../../' + oDocument._id + '?rev=' + oDocument._rev,
            async:    false,
            success:    function(sDocument) {
                var document = JSON.parse(sDocument);
                if (fCallback) {
                    fCallback(document);
                }
                $.jGrowl("Page has been deleted with id " + document.id, {header: "Deleted"});
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                $.jGrowl("Ooooops!, delete request failed with status: " + oXmlHttpRequest
                .status + ' ' + oXmlHttpRequest.responseText);
            }
        });
    },
    deleteName: function(sName, fCallback) {
        // get existing object (so will have correct _rev)
        fCallback = fCallback || null;
        var document;
        var _this = this;
        $.ajax({
            type: 'get',
            url: '../../' + sName + "?revs=true",
            success: function(sDocument) {
                document = JSON.parse(sDocument);
                _this.deleteDocument(document, fCallback);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                alert('Document ' + sName + ' could not be accessed');
            }
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
 * Textareas
 *******************************************************************************/
var JsrTextArea = JsrRoot.create({
    shouldTest: true,
    _id: null,
    id: F.getSet('_id'),
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
        $(this.id()).keydown(function(e) {
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
    }
});
JsrTarText = JsrTextArea.create({
    _id: '#tarText',
    _text: null,

    //=======================
    // storage
    //=======================
    save: function(fCallback) {
        fCallback = fCallback || null;
        JsrCouchDb.saveNameText(this.name(), this.getText(), fCallback);
    },
    read: function(sName) {
        var _this = this;
        JsrCouchDb.readNameText(sName, function(sText) {
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
        return s.replace(/ /, '_');
    },
    name: function() {
        return this.spaceToUnderscore(this.firstLine(this.getText()));
        return this;
    },

    //=======================
    // Creole / Text
    //=======================
    toCreole: function() {
        var text = this.getText();
        this._text = text;
        var node = $('#divTar')[0];
        //eval(decodeEntities($('parser').innerHTML));
        var creole = new Parse.Simple.Creole({
            interwiki: {
                WikiCreole: 'http://www.wikicreole.org/wiki/',
                Wikipedia: 'http://en.wikipedia.org/wiki/'
            },
            linkFormat: ''
        });

        var render = function() {
            node.innerHTML = '';
            creole.parse(node, text);
        };

        render();
        return this;
    },
    toText: function() {
        $('#divTar').html('<textarea id="tarText" class="tar border"></textarea>');
        this.setText(this._text);
        return this;
    },

    //=======================
    // replace
    //=======================
    replaceWith: function(sElement) {
        $(this._id).replaceWith(sElement);
        return this;
    }
});