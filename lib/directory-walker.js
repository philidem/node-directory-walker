// third-party dependencies
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');

function stop() {
    this.stopped = true;
}

function DirectoryWalker(config) {
    events.EventEmitter.call(this);

    this._recursive = true;
    this._pending = 0;
    this._exclusions = require('path-filters').create();
}

util.inherits(DirectoryWalker, events.EventEmitter);

DirectoryWalker.prototype.listeners = function(listeners) {
    for (var key in listeners) {
        if (listeners.hasOwnProperty(key)) {
            this.on(key, listeners[key]);
        }
    }
    return this;
};

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

DirectoryWalker.prototype.exclude = function(filter, recursive) {
    this._exclusions.add(filter, recursive);
    return this;
};

DirectoryWalker.prototype.walk = function(dir) {
    this._visit(dir);
    return this;
};

DirectoryWalker.prototype.getExclusions = function() {
    return this._exclusions;
};

DirectoryWalker.prototype._visit = function(path, parent) {
    var self = this;

    this._pending++;

    fs.stat(path, function(err, stat) {
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

            eventArgs.stop = stop;
            self.emit('directory', path, eventArgs);

            if (!eventArgs.stopped && self._recursive) {
                self._walkDir(path);
            }
        } else {
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

        for (var i = 0; i < filenames.length; i++) {
            var filename = path.join(dir, filenames[i]);

            if (!self._exclusions.hasMatch(filename)) {
                self._visit(filename, dir);
            }
        }

        if (self._pending === 0) {
            self.emit('complete');
        }
    });
};

exports.create = function() {
    return new DirectoryWalker();
};
