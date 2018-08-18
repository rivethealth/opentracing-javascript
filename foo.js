var hooks = require('async_hooks');

var id;

var h = hooks.createHook({before: asyncId => id = asyncId});

setTimeout(() => h.enable());
setTimeout(() => console.log(id), 0);
