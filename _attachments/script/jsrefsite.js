/*******************************************************************************
 * Project JavaScript Reference Site (JS Ref Site)
 *
 * Started March, 2011
 *
 * By Stanley R. Silver and Peter de Croos
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
        this.button(id++, 'Eval', function(e) {
            JsrEval.evaluateLines();
        });
        this.button(id++, 'cr to \\n', function(e) {
            JsrEval.breakString();
        });
        this.button(id++, 'cr to \\n + cr', function(e) {
            JsrEval.breakStringPlus();
        });
        this.button(id++, 'array of lines', function(e) {
            JsrEval.arrayOfLines();
        });
        this.button(id++, 'main lines', function(e) {
            JsrEval.mainLines();
        });
        this.button(id++, 'Save Page', function(e) {
            JsrTarText.save();
            JsrReadButton.resetMenu();
        });
        JsrReadButton.id('#btn' + id++).setMenu().colorClean();
        this.button(id++, 'Test', function(e) {
        });
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
    }
});
var JsrReadButton = JsrButton.create({
    generateReadCallback: function(sName) {
        return function() {
            JsrCouchDb.readNameText(sName, function(sText) {
                JsrTarText.setText(sText);
            });
        };
    },
    resetMenu: function() {
        var _this = this;
        JsrCouchDb.readIds(function(aIds) {
            var menuArray = [];
            aIds.forEach(function(each) {
                var item = {};
                var callback = _this.generateReadCallback(each);
                item[each] = callback;
                menuArray.push(item);
            });
            menuArray.push({'Cancel': function() {}});
            var menu = $.contextMenu.create(menuArray, {});
            $(_this._id).click(function(e) {
                menu.show(this, e);
                return false;
            });
        });
        return this;
    },
    setMenu: function() {
        $.contextMenu.theme = 'osx';
        $(this._id).text('Read Page');
        this.resetMenu();
        return this;
    }
});

/*******************************************************************************
 * Couch
 *******************************************************************************/
var JsrCouchDb = JsrRoot.create({
    readIds: function(fCallback) {
        $.ajax({
            type: 'get',
            url: '_view/ids',
            success: function(sDocument) {
                var document = JSON.parse(sDocument);
                var array = document.rows;
                var ids = array.map(function(each) {
                    return each.key;
                });
                fCallback(ids);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                alert("Ooooops!, save request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
            }
        });
    },
    saveDocument: function(oDocument) {
        //assume correct _id and correct _rev
        $.ajax({
            type:    'put',
            url:    '../../' + oDocument._id,
            data:    JSON.stringify(oDocument),
            async:    false,
            success:    function(sDocument) {
                var document = JSON.parse(sDocument);
                alert("Your page has been saved..." + sDocument, {header: "Cool!"});
                $.jGrowl("Your page has been saved..." + sDocument, {header: "Cool!"});
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                alert("Ooooops!, save request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
            }
        });
    },
    saveNameText: function(sName, sText) {
        // get existing object (so will have correct _rev) or create new object
        var documentObject;
        var _this = this;
        $.ajax({
            type: 'get',
            url: '../../' + sName + "?revs=true",
            success: function(sDocument) {
                documentObject = JSON.parse(sDocument);
                documentObject.text = sText;
                _this.saveDocument(documentObject);
            },
            error: function (oXmlHttpRequest, sStatus, oError) {
                documentObject = {
                    _id: sName
                };
                documentObject.text = sText;
                _this.saveDocument(documentObject);
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
                alert("Ooooops!, request failed with status: " + oXmlHttpRequest.status + ' ' + oXmlHttpRequest
                .responseText);
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
                    return false;
                }
            }
            return true;
        });
    }
});
JsrTarText = JsrTextArea.create({
    _id: '#tarText',

    //=======================
    // storage
    //=======================
    save: function() {
        JsrCouchDb.saveNameText(this.name(), this.getText());
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
    }
});