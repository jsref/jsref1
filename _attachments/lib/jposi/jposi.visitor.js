var Visitor = PRoot.create({
    _targetsVisited: null,
    _isRevisit: false,
    _maxCount: 1000,
    _count: 0,
    _index: false,
    _indexAll: false,
    _revisit: false,
    targetsVisited: F.getSetArray('_targetsVisited'),
    isRevisit: F.getSet('_isRevisit'),
    indexOn: function() {
        this._index = true;
        this._indexAll = false;
        return this;
    },
    indexAllOn: function() {
        this._index = false;
        this._indexAll = true;
        return this;
    },
    indexOff: function() {
        this._index = false;
        this._indexAll = false;
        return this;
    },
    //
    visit: function (vTarget) {
        //Count and record visit (to control recursive visits)
        if (this.isCountExceeded()) {
            return this.countExceeded.apply(this, arguments);
        }
        this.recordVisit(vTarget);
        //Hook for subclasses
        this.preVisit.apply(this, arguments);
        //Lookup and call a visit method, with optional arguments
        var selector = this.getSelector(vTarget);
        var args = Array.prototype.slice.call(arguments);
        //Call visit method - target is the first arg; other args are optional
        try {
            var result = this[selector].apply(this, args);
            return result;
        } catch (e) {
            var message = e.message + ' => ' + selector;
            throw {
                name: e.name,
                message: message
            }
            return message;
        }
    },
    isCountExceeded: function() {
        this._count += 1;
        return this._count > this._maxCount;
    },
    countExceeded: function() {
        //Hook for subclasses
        return 'Count Exceeded';
    },
    preVisit: function() {
        //Hook for subclasses
        return this;
    },
    recordVisit: function(vTarget) {
        //Used to control recursive visits - update vTargetsVisited
        if (this.targetIndex(vTarget) < 0) {
            this.isRevisit(false);
            this.targetsVisited().push(vTarget);
        } else {
            this.isRevisit(true);
        }
        return this;
    },
    targetIndex: function(vTarget) {
        //Return a unique index for each vTarget (acts like an object id)
        var index = $.inArray(vTarget, this.targetsVisited());
        return index;
    },
    getSelector: function (vTarget) {
        //Return a selector that is defined for this particular visitor and target
        if (vTarget === undefined) {
            var selector = this.undefinedSelector();
            if (this[selector]) {
                return selector;
            } else {
                return this.anySelector();
            }
        }
        if (vTarget === null) {
            var selector = this.nullSelector();
            if (this[selector]) {
                return selector;
            }
        }
        var selector = this.constructorSelector(vTarget);
        if (this[selector]) {
            return selector
        }
        selector = this.typeofSelector(vTarget);
        if (this[selector]) {
            return selector
        }
        return this.anySelector();
    },
    constructorSelector: function (vTarget) {
        //Return a visit selector made from the vTarget's constructor
        return 'visit_' + (vTarget.constructor.name || this.constructorName(vTarget));
    },
    constructorName: function (vTarget) {
        //Parse the function name from the function source string
        return vTarget.constructor.toString().split(' ')[1].slice(0, -2);
    },
    typeofSelector: function (vTarget) {
        //Return a visit selector made from the vTarget's type
        return 'visit_' + typeof(vTarget);
    },
    undefinedSelector: function () {
        //Return the default undefined selector
        return 'visit_undefined';
    },
    nullSelector: function () {
        //Return the default null selector
        return 'visit_null';
    },
    anySelector: function () {
        //Return the default visit selector
        return 'visit_any';
    },
    visit_any: function(vTarget) {
        //dummy function
        return 'Visited Any';
    }
});
var PrintVisitor = Visitor.create({
    //
    // var myString = PrintVisitor.visit({one:1})
    // var ws = WriteStream.create()
    // PrintVisitor.visit({one:1}, ws)
    //
    crDotVisit: function(v, ws) {
        var string = this.visit(v, ws);
        var crs = string.replace(/\n/g, '<cr>');
        var spaces = crs.replace(/ /g, '.');
        return spaces;
    },
    visit: function(v, ws) {
        if (!ws) {
            ws = WriteStream.create();
        }
        //Cannot use apply(this, arguments) because of ws
        var result = Visitor.visit.call(this, v, ws);
        return result;
    },
    countExceeded: function(v, ws) {
        ws.s('<count exceeded>');
        return 'Count Exceeded';
    },
    preVisit: function(v, ws) {
        if (this._indexAll) {
            var index = this.targetIndex(v);
            ws.s(index).s('~');
        }
        return this;
    },
    visit_Object: function(o, ws) {
        ws.s('{');
        if (this._index && !this._indexAll) {
            var index = this.targetIndex(o);
            ws.s(index);
        }
        var count = 0;
        var key;
        for (key in o) {
            if (o.hasOwnProperty(key)) {
                count++;
            }
        }
        if (this.isRevisit() && !this._revisit) {
            this.visit_Revisit(o, ws);
        } else {
            if (count <= 1) {
                this.visit_Object1(o, ws);
            } else {
                this.visit_ObjectN(o, ws);
            }
        }
        ws.s('}');
        return ws.contents();
    },
    visit_Object1: function(o, ws) {
        ws.sp();
        for (var key in o) {
            var value = o[key];
            if (o.hasOwnProperty(key)) {
                ws.s(key).colon().sp().visitWith(value, this);
            }
        }
        ws.sp();
        return ws.contents();
    },
    visit_ObjectN: function(o, ws) {
        ws.cr().inc();
        for (var key in o) {
            var value = o[key];
            if (o.hasOwnProperty(key)) {
                ws.key(key).visitWith(value, this).unStop().cr();
            }
        }
        ws.dec().ind();
        return ws.contents();
    },
    visit_Revisit: function(oa, ws) {
        ws.s(' <revisit> ');
        return ws.contents();
    },
    visit_Array: function(a, ws) {
        var visitor = PrintVisitor.create();
        var writeStream = WriteStream.create();
        var result = visitor.visit_ArrayLine(a, writeStream);
        if (result.length < 60) {
            ws.s(result);
            return ws.contents();
        } else {
            return this.visit_ArrayLines(a, ws);
        }
    },
    visit_ArrayLine: function(a, ws) {
        ws.s('[');
        if (this._index && !this._indexAll) {
            var index = this.targetIndex(a);
            ws.s(index);
        }
        ws.sp();
        if (this.isRevisit() && !this._revisit) {
            this.visit_Revisit(a, ws);
        } else {
            this.visit_ArrayElements(a, ws);
        }
        ws.s(' ]');
        return ws.contents();
    },
    visit_ArrayLines: function(a, ws) {
        ws.s('[');
        if (this._index && !this._indexAll) {
            var index = this.targetIndex(a);
            ws.s(index);
        }
        ws.cr().inc().ind();
        if (this.isRevisit() && !this._revisit) {
            this.visit_Revisit(a, ws);
        } else {
            this.visit_ArrayElementsLines(a, ws);
        }
        ws.cr().dec().ind().s(']');
        return ws.contents();
    },
    visit_ArrayElements: function(a, ws) {
        for (var i in a) {
            this.visit(a[i], ws);
            if (i < a.length - 1) {
                ws.s(', ');
            }
        }
        return ws.contents();
    },
    visit_ArrayElementsLines: function(a, ws) {
        for (var i in a) {
            this.visit(a[i], ws);
            if (i < a.length - 1) {
                ws.comma().cr().ind();
            }
        }
        return ws.contents();
    },
    visit_String: function(s, ws) {
        ws.s("'").s(s).s("'");
        return ws.contents();
    },
    visit_Function: function(f, ws) {
        ws.s('Function');
        return ws.contents();
    },
    visit_Date: function(d, ws) {
        function two(i) {
            return ('0' + i).slice(-2);
        }

        var day = d.getDate();
        var month = d.getMonth() + 1;
        var year = d.getFullYear();
        var string = two(day) + '/' + two(month) + '/' + year;
        ws.s(string);
        return ws.contents();
    },
    visit_object: function(o, ws) {
        try {
            ws.s(this.constructorName(o));
        } catch(e) {
            ws.s('<cannot read object constructor>');
        }
        return this.visit_Object(o, ws);
    },
    visit_undefined: function(v, ws) {
        ws.s('undefined');
        return ws.contents();
    },
    visit_null: function(v, ws) {
        ws.s('null');
        return ws.contents();
    },
    visit_any: function(v, ws) {
        ws.s(v);
        return ws.contents();
    }
});