function(doc, req) {
    var text, html;
    function typeText(doc) {
        var text = doc.text;
        return '<textarea id="tarText" class="tar border">' + text + '</textarea>';
    }

    if (!doc.type) {
        return typeText(doc);
    }
    if (doc.type === 'page') {
        return typeText(doc);
    }
    if (doc.type === 'markdown') {
        var markdown = require('vendor/couchapp/lib/markdown');
        html = markdown.encode(doc.text);
        return html;
    }
    if (doc.type === 'googleWiki') {
        try {
            var Module = require('vendor/couchapp/lib/GoogleCodeWikiParser');
            var parser = new Module.Parser();
            html = parser.parse(doc.text);
            return html;
        } catch(error) {
            return 'ERROR >> ' + error.message + ' <<';
        }
    }
    if (doc.type === 'wiky') {
        try {
            var Module = require('vendor/couchapp/lib/wiky');
            html = Module.wiky.toHtml(doc.text);
            return html;
        } catch(error) {
            return 'ERROR >> ' + error.message + ' <<';
        }
    }
}