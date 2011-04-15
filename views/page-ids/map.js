function(doc) {
    if (doc.type === 'page' || doc.wiki === true) {
        emit(doc._id);
    }
}