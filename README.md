```
$ npm install typescript@next
$ ./node_modules/.bin/tsc

# FAILS
$ node ./built/compile.js project project/genfiles

# WORKS
$ ./node_modules/.bin/tsc -p project

$ ls project/genfiles
b.ts

# STILL FAILS!
$ node ./built/compile.js project project/genfiles
```
