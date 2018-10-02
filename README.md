# LDflex makes Linked Data in JavaScript fun
LDflex is a domain-specific language for JavaScript
that lets you traverse Linked Data graphs like dynamic objects.

You can write things like `person.friends.firstName`
to get a list of your friends.
Thanks to the power of [JSON-LD contexts](https://www.w3.org/TR/json-ld/#the-context)
and [JavaScript's Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy),
these properties are not hard-coded in LDflex
and can be chosen at runtime.

[Tim Berners-Lee](https://www.w3.org/People/Berners-Lee/)
came up with the idea for such a fluid JavaScript interface to Linked Data,
in a discussion on how to make Linked Data easier for developers.

## Installation
```bash
npm install ldflex
```

In order to execute queries,
you will also need a query engine:
```bash
npm install ldflex-comunica
```

## Usage
When you have obtained a starting subject,
you can navigate through its properties
using standard JavaScript dot property syntax.

In order to query for the result,
use `await` if you want a single value,
or `for await` to iterate over all values.

### Initialization
```JavaScript
const { QueryPathFactory } = require('ldflex');
const { default: ComunicaEngine } = require('ldflex-comunica');

// The JSON-LD context for resolving properties
const context = {
  "@context": {
    "@vocab": "http://xmlns.com/foaf/0.1/",
    "friends": "knows",
    "label": "http://www.w3.org/2000/01/rdf-schema#label",
  }
};
// The query engine and its source
const queryEngine = new ComunicaEngine('https://ruben.verborgh.org/profile/');
// The object that can create new paths
const path = new QueryPathFactory({ context, queryEngine });
```

### Looking up data on the Web
```JavaScript
const ruben = path.create({ subject: 'https://ruben.verborgh.org/profile/#me' });
showPerson(ruben);

async function showPerson(person) {
  console.log(`This person is ${await person.name}`);

  console.log(`${await person.givenName} is interested in:`);
  for await (const name of person.interest.label)
    console.log(`- ${name}`);

  console.log(`${await person.givenName} is friends with:`);
  for await (const name of person.friends.givenName)
    console.log(`- ${name}`);
}
```

### Inspecting the generated path expression
```JavaScript
(async person => {
  console.log(await person.friends.givenName.pathExpression);
})(ruben);

```

### Converting into a SPARQL query
```JavaScript
(async person => {
  console.log(await person.friends.givenName.sparql);
})(ruben);

```

## License
©2018–present [Ruben Verborgh](https://ruben.verborgh.org/),
[MIT License](https://github.com/RubenVerborgh/LDflex/blob/master/LICENSE.md).
