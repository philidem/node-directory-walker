// third-party dependencies
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');

function DirectoryWalker(config) {
    events.EventEmitter.call(this);
    
    this._recursive = true;
    this._pending = 0;
}

util.inherits(DirectoryWalker, events.EventEmitter);

DirectoryWalker.prototype.listeners = function(listeners) {
    for (var key in listeners) {
        if (listeners.hasOwnProperty(key)) {
            this.on(key, listeners[key]);
        }
    }
    return this;
}

DirectoryWalker.prototype.onRoot = function(callback) {
    this.on('root', callback);
    return this;
};

DirectoryWalker.prototype.onPath = function(callback) {
    this.on('path', callback);
    return this;
};

DirectoryWalker.prototype.onFile = function(callback) {
    this.on('file', callback);
    return this;
};

DirectoryWalker.prototype.onDirectory = function(callback) {
    this.on('directory', callback);
    return this;
};

DirectoryWalker.prototype.onError = function(callback) {
    this.on('error', callback);
    return this;
};

DirectoryWalker.prototype.onComplete = function(callback) {
    this.on('complete', callback);
    return this;
};

DirectoryWalker.prototype.recursive = function(recursive) {
    this._recursive = recursive;
    return this;
};

DirectoryWalker.prototype.walk = function(dir) {
    this._visit(dir);
};

DirectoryWalker.prototype._visit = function(path, parent) {
    var self = this;

    this._pending++;

    fs.stat(path,
        function(err, stat) {
            self._pending--;
            var eventArgs = {
                path: path,
                stat: stat,
                parent: parent
            };

            self.emit('path', path, eventArgs);

            if (!parent) {
                self.emit('root', path, eventArgs);
            }

            if (stat && stat.isDirectory()) {
                var stopped = false;

                eventArgs.stop = function() {
                    stopped = true;
                }

                self.emit('directory', path, eventArgs);

                if (!stopped && self.recursive) {
                    self._walkDir(path);
                }
            } 
            else {
                self.emit('file', path, eventArgs);
            }

            if (self._pending === 0) {
                self.emit('complete');
            }
        });
};

DirectoryWalker.prototype._walkDir = function(dir) {

    var self = this;

    this._pending++;

    fs.readdir(dir, function(err, filenames) {
        self._pending--;

        if (err) {
            self.emit('error', err);
            return;
        }

        for ( var i = 0; i < filenames.length; i++) {
            self._visit(path.join(dir, filenames[i]), dir);
        }

        if (self._pending === 0) {
            self.emit('complete');
        }
    });
};

exports.create = function() {
    return new DirectoryWalker();
};