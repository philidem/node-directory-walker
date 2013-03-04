// third-party dependencies
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');

function DirectoryWalker(config) {
    events.EventEmitter.call(this);
    
    this.onFile = config.onFile;
    this.onDirectory = config.onDirectory;
    this.pending = 0;

    if (config.excludes) {
        this._excludesMap = {};

        for (var i = 0; i < config.excludes.length; i++) {
            var exclude = path.resolve(config.excludes[i]);
            this._excludesMap[exclude] = true;
        }
    }

    if (config.listeners) {
        var listeners = config.listeners;
        for (var key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                this.on(key, listeners[key]);
            }
        }
    }
}

util.inherits(DirectoryWalker, events.EventEmitter);

DirectoryWalker.prototype.walk = function(dir) {
    this.visit(dir);
};

DirectoryWalker.prototype.notifyComplete = function() {
    this.emit('complete');
};

DirectoryWalker.prototype.isExplicitExclude = function(path) {
    return this._excludesMap && this._excludesMap[path];
};

DirectoryWalker.prototype.visit = function(file, parent) {
    var self = this;

    this.pending++;

    fs.stat(file,
        function(err, stat) {
            self.pending--;

            if (stat && stat.isDirectory()) {
                self.readdir(file);
            } else {
                // if onFile returns false then don't visit file
                if (!self.onFile || (self.onFile(file) !== false)) {
                    self.emit('file', file, parent);
                }
            }

            if (self.pending === 0) {
                self.notifyComplete();
            }
        });
};

DirectoryWalker.prototype.readdir = function(dir) {

    var dir = path.resolve(dir);
    if (this._excludesMap && this._excludesMap[dir]) {
        return;
    }

    var self = this;

    this.pending++;

    fs.readdir(dir, function(err, files) {
        self.pending--;

        if (err) {
            self.emit('error', err);
            return;
        }

        if (!self.onDirectory || (self.onDirectory(dir) !== false)) {
            self.emit('directory', dir);

            for ( var i = 0; i < files.length; i++) {
                var file = path.resolve(dir + '/' + files[i]);
                if (!this._excludesMap || !this._excludesMap[dir]) {
                    self.visit(file, dir);
                }
            }
        }

        if (self.pending === 0) {
            self.notifyComplete();
        }
    });
};

exports.createDirectoryWalker = function(config) {
    return new DirectoryWalker(config);
};

exports.walk = function(options) {
    var walker = new DirectoryWalker(options);
    walker.walk(options.basedir);
}
