module.exports = function(bookshelf) {
	var Game = bookshelf.Model.extend({
        tableName: 'games',
        
    }, {

    });

    return Game;
};