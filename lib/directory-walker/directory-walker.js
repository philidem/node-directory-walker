// third-party dependencies
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');

function DirectoryWalker(config) {
    events.EventEmitter.call(this);

    this.basedir = config.basedir;
    this.onFile = config.onFile;
    this.onDirectory = config.onDirectory;

    if (config.excludes) {
        this.excludes = {};
        for (var i = 0; i < config.excludes.length; i++) {
            var exclude = path.normalize(config.excludes[i]);
            this.excludes[exclude] = true;
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

DirectoryWalker.prototype.start = function() {
    // right before we read directory, we increment pending
    // right after directory is read, we decrement pending
    // when pending drops back to zero then we are down walking
    this.pending = 0;
    this.readdir(this.basedir);
};

DirectoryWalker.prototype.notifyComplete = function() {
    this.emit('complete');
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

    var dir = path.normalize(dir);
    if (this.excludes && this.excludes[dir]) {
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
                var file = path.normalize(dir + '/' + files[i]);
                if (!this.excludes || !this.excludes[dir]) {
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
    walker.start();
}
