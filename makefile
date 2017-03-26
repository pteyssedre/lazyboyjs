test:
    ./node_modules/.bin/istanbul cover _mocha ./dist/test --reporter spec
.PHONY: coverage
